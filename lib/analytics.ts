
type GtagJSType = (command: 'js' | 'config' | 'event', eventName: any, eventParams?: object) => void;
interface LocalWindow extends Window {
	dataLayer?: Array<object>;
	gtag?: GtagJSType;
};

declare let window: LocalWindow;

export class Analytics {

	constructor(tagID: string) {

		if (window.gtag) throw new Error('GA is already started');

		const headScript = document.createElement('script');
		headScript.src = `https://www.googletagmanager.com/gtag/js?id=${tagID}`;
		headScript.async = true;
		document.head.appendChild(headScript);
	
		window.dataLayer = window.dataLayer || [];
	
		window.gtag = function () {
			window.dataLayer!.push(arguments);
		};
	
		window.gtag('js', new Date());
		window.gtag('config', tagID);

		document.querySelectorAll<HTMLLIElement>('[data-track]').forEach(elem => {

			const eventID = elem.getAttribute('data-track-click');
			if (!eventID?.length) {
				console.log('Element', elem, 'has empty event id [data-track]');
				return;
			}
	
			const clickHandler = () => {
				this.pushEvent(eventID);
				elem.removeEventListener('click', clickHandler);
			};
	
			elem.addEventListener('click', clickHandler);
		});

	}

	pushEvent(eventID: string, params?: Record<string, string>) {

		if (!eventID.length) {
			console.warn('eventID must not be empty');
			return;
		}

		//	set event id to uppercase
		eventID = eventID[0].toUpperCase() + eventID.slice(1);

		console.log('Reporting analytics event:', eventID);
		(window.gtag as GtagJSType)('event', eventID, params);
	}

};
