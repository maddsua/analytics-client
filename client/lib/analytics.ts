interface WindowWithAnalytics extends Window {
	dataLayer?: Array<object>;
	gtag?: (command: 'js' | 'config' | 'event', eventName: any, eventParams?: object) => void;
}

declare let window: WindowWithAnalytics;

interface LoaderInit {
	tagid: string;
	type?: 'gtag' | 'gtm';
	trackClicks?: boolean;
}

export const loadGoogleAnalytics = (props: LoaderInit) => {

	const headScript = document.createElement('script');
	headScript.src = `https://www.googletagmanager.com/gtag/js?id=${props.tagid}`;
	headScript.async = true;

	document.head.appendChild(headScript);

	window.dataLayer = window.dataLayer || [];

	if (props?.type === 'gtm') {
		window.dataLayer.push({
			'gtm.start': new Date().getTime(),
			'event': 'gtm.js'
		});
	}
	else {
		
		window.gtag = function () {
			window.dataLayer!.push(arguments);
		};

		window.gtag('js', new Date());
		window.gtag('config', props.tagid);
	}

	if (props?.trackClicks) {

		document.querySelectorAll<HTMLLIElement>('[data-track]').forEach(elem => {

			const eventID = elem.getAttribute('data-track');
			if (!eventID?.length) {
				console.log('Element', elem, 'has empty event id [data-track]');
				return;
			}
	
			const clickHandler = () => {
				pushEvent(eventID);
				elem.removeEventListener('click', clickHandler);
			};
	
			elem.addEventListener('click', clickHandler);
		});
	}
};

export const pushEvent = (eventID: string, props?: object) => {

	//	send eventID first character to upper case
	if (eventID[0].toUpperCase() !== eventID[0]) {
		eventID = eventID[0].toUpperCase() + eventID.slice(1);
	}

	console.log('Reporting analytics event:', eventID);

	if (!window.dataLayer) {
		console.warn('dataLayer is not available (yet?)');
		window.dataLayer = window.dataLayer || [];
	}

	window.dataLayer.push(Object.assign({ 'event': eventID }, props || {}))
};
