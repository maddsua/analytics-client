
type LogEventType = 'error' | 'warn' | 'log';

interface EventItem {
	type: LogEventType;
	message: string;
	data_dump?: object;
};

interface ClientFingerprint {
	client_ip?: string | null;
	client_agent?: string | null;
	request_id?: string | null;
};

interface EAConfig {
	remote: string;
	token: string;
	app_id: string;
	api_name?: string;
	reflectInLogs?: boolean;
};

interface EAContext {
	fingerprint?: ClientFingerprint;	
};

interface PushEventProps extends Omit<EventItem, 'message'> {
	message: string | string[];
};

const apiPaths = {
	supabase: '/rest/v1/events',
};

export class EventAggregator {

	data: EventItem[] = [];
	cfg: EAConfig;
	ctx?: EAContext;

	constructor(init: EAConfig, ctxInit?: EAContext) {
		this.cfg = init;
		this.ctx = ctxInit;
	}

	push(event: PushEventProps) {

		const { type, data_dump } = event;
		const message = typeof event.message === 'string' ? event.message : event.message.join('\n');

		this.data.push({ type, message, data_dump });

		if (this.cfg.reflectInLogs !== false) {

			const consoleIO = console[event.type] || console.log;
			consoleIO(event.message);

			if (event.data_dump) {
				console.log('Dumping data:', JSON.stringify(event.data_dump))
			}
		}
	}

	transform(type: LogEventType, args: any[]): EventItem {

		//	split objects and primitives
		const dataParts: object[] = [];
		const textParts: string[] = args.map(item => {
			switch (typeof item) {
				case 'string': return item;
				case 'object': {
					dataParts.push(item);
					return dataParts.length > 1 ? `[object dump  #${dataParts.length - 1}]` : '[object dumped]';	
				};	
				default: return item?.toString?.();
			}
		});

		const message = textParts.filter(item => item.length).join(' ');
		const data_dump = dataParts.length > 0 ? (dataParts.length > 1 ? dataParts : dataParts[0]) : undefined;

		return { type, message, data_dump };
	}

	log(...data: any[]) {
		this.push(this.transform('log', [...arguments]));
	}

	warn(...data: any[]) {
		this.push(this.transform('warn', [...arguments]));
	}

	error(...data: any[]) {
		this.push(this.transform('error', [...arguments]));
	}

	async flush() {

		if (!this.data.length) return;

		interface InsertRowItem extends EventItem, ClientFingerprint {
			app_id: string;
			api?: string;
		};

		const payload: InsertRowItem[] = this.data.map(item => Object.assign({
			app_id: this.cfg.app_id,
			api: this.cfg.api_name
		}, item, this.ctx?.fingerprint));

		try {

			const remoteUrl = new URL(this.cfg.remote);
			remoteUrl.pathname = apiPaths.supabase;
			remoteUrl.search = '';

			const response = await fetch(remoteUrl, {
				method: 'POST',
				headers: {
					apikey: this.cfg.token,
					'content-type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const responseText = await response.text();
				const isMeaningful = /[\w\d\"]+/.test(responseText);
				throw new Error(isMeaningful ? responseText : `http: ${response.status}`);
			}

			this.data = [];
			console.log('Flushed events successfully');
			
		} catch (error) {
			console.error('Failed to flush logpush events:', (error as Error | null)?.message || JSON.stringify(error));
		}

	}
};
