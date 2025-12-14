import { LectioJSUtils } from './../LectioJSUtils';

export class LCDocumentPresentationAudioPlayer {

	static initCount = 0;
	public static Init(): void {
		const icnt = ++LCDocumentPresentationAudioPlayer.initCount;

		if (icnt > 1) {
			// 20171221 RH: Vi bliver kaldt fra to forskellige steder for hjaelpeartikler (startup script og lcdocpresentation),
			// men da vi initialiserer globalt, holder vi bare snitterne vaek, naar vi er blevt kaldt foer.
			// LectioJSUtils.LogDebug('audio double init...x');
			return;
		}
		const loc = window.location.pathname;
		$(() => {
			$(document).on('click', 'img[data-embed-xhtml]', evt => {
				const el = evt.target;
				// // Vi aktiverer ikke afspilning i editoren.
				// if (el.parentElement && $(el.parentElement).hasClass('cke_widget_wrapper'))
				// 	return;
				const xhtml = el.getAttribute('data-embed-xhtml')!;
				LectioJSUtils.AssertNotNullOrEmpty(xhtml, "xhtml");
				$(xhtml).insertAfter(el).addClass('ls--video');
				$(el).css('display', 'none');
			});

			enum AudioPlayState {
				None = 0,
				Waiting = 1,
				Playing = 2,
				PausedEx = 3,
				Error = 4,
				Ended = 5,
			}

			const AudioReadyStates = {
				HAVE_NOTHING: 0,
				HAVE_METADATA: 1,
				HAVE_CURRENT_DATA: 2,
				HAVE_FUTURE_DATA: 3,
				HAVE_ENOUGH_DATA: 4,
			};
			interface AudioPlayerState {
				audioElement: HTMLAudioElement;
				on: (eventType: string) => Rx.Observable<Event>;
				errors: Event[];
				reset: () => void;
			}

			function getAudioPlayerState(audioplayer: AudioPlayerState): AudioPlayState {
				// https://html.spec.whatwg.org/multipage/embedded-content.html#playing-the-media-resource
				const audio = audioplayer.audioElement;
				const rs = audio.readyState;
				const pausedui = audio.paused;
				//const pausedui = !audio.paused && (rs === AudioReadyStates.HAVE_FUTURE_DATA || rs === AudioReadyStates.HAVE_ENOUGH_DATA);
				const pausedEx = pausedui;

				const blocked = (rs === AudioReadyStates.HAVE_NOTHING || rs === AudioReadyStates.HAVE_METADATA || rs === AudioReadyStates.HAVE_CURRENT_DATA) || pausedEx;
				const ended = rs >= AudioReadyStates.HAVE_METADATA && (audio.currentTime === audio.duration);
				const potentiallyPlaying = !audio.paused && !ended && (audioplayer.errors.length === 0) && !blocked;

				if (potentiallyPlaying)
					return AudioPlayState.Playing;
				if (pausedEx)
					return AudioPlayState.PausedEx;
				if (ended)
					return AudioPlayState.Ended;
				if (audioplayer.errors.length)
					return AudioPlayState.Error;
				return AudioPlayState.Waiting;
			}

			let globalAudioPlayer: AudioPlayerState;
			const newplayer = new Rx.Subject<any>();

			function getGlobalAudioPlayer(): AudioPlayerState {
				if (!globalAudioPlayer) {
					const audioelement = document.createElement('audio');
					audioelement.setAttribute('id', 'lectioaudio');
					document.body.appendChild(audioelement);

					const audioplayer: AudioPlayerState = {
						audioElement: audioelement,
						on: eventType => Rx.Observable.fromEvent<Event>($(audioelement) as any as HTMLElement, eventType).takeUntil(newplayer),
						errors: [],
						reset() {
							audioelement.pause();
							audioelement.src = '';
							newplayer.onNext(null);
							this.errors = [];
						},
					};

					audioplayer.on('error').subscribe(e => {
						audioplayer.errors.push(e);
						if (audioplayer.errors.length > 100) {
							const end = audioplayer.errors.slice(audioplayer.errors.length - 40, audioplayer.errors.length);
							audioplayer.errors = audioplayer.errors.slice(0, 50).concat(end);
						}

						LectioJSUtils.LogDebug('audioerror', e);
					});

					globalAudioPlayer = audioplayer;
				}

				return globalAudioPlayer;
			}

			$(document).on('click', 'img[data-lc-type="audio"]', e => {
				const img = e.target as HTMLImageElement;

				const url = img.getAttribute('data-lc-resource');
				if (!url)
					throw new Error('Mangler data-lc-resource.');

				const audioplayer = getGlobalAudioPlayer();
				const issame = audioplayer.audioElement.src.indexOf(url) !== -1;
				if (issame) {
					const state = getAudioPlayerState(audioplayer);
					if (state === AudioPlayState.Playing || state === AudioPlayState.Ended)
						audioplayer.audioElement.pause();
					else if (state === AudioPlayState.PausedEx)
						audioplayer.audioElement.play();
					else if (state === AudioPlayState.Error) {
						const src = audioplayer.audioElement.src;
						audioplayer.reset();
						audioplayer.audioElement.src = src;
						audioplayer.audioElement.play();
					}
					else
						LectioJSUtils.LogDebug('audio kan ikke starte/stoppe', state, audioplayer.audioElement);
				}
				else {
					audioplayer.reset();
					audioplayer.on('error play pause ended').subscribe(e => {
						// Aht. test.
						$(audioplayer.audioElement).trigger({ type: 'lectioaudio', audioEventType: e.type, data: e } as any);

						let imgsrc: string;
						if (e.type === 'play')
							imgsrc = '/lectio/img/audiopause24x24.auto';
						else
							imgsrc = '/lectio/img/audioplay24x24.auto';
						img.src = imgsrc;
					});

					audioplayer.audioElement.src = url;
					audioplayer.audioElement.play();
				}
			});
		});
	}
}
