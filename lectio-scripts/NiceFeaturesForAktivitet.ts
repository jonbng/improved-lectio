/// <reference types="jquery"/>
/// <reference types="jqueryui"/>

import { LectioJSUtils } from './LectioJSUtils';
import { HtmlUtilities } from "./HtmlUtilities";

export class NiceFeaturesForAktivitet {

	public static Initialize(buttonId: string, students: string[], studentPicturesSmall: string[], studentPicturesLarge: string[]) {
		const button = $('#' + buttonId);

		const contextMenu = button.next('.lec-context-menu');
		contextMenu.find('#chooseRandomStudent').click(() => {
			this.chooseRandomStudent(students, studentPicturesLarge);
		});
		contextMenu.find('#chooseRandomStudentAnimated').click(() => {
			this.chooseRandomStudentAnimated(students, studentPicturesLarge);
		});

		contextMenu.find('#createGroups').click(() => {
			this.createGroups(students, 4);
		});

		contextMenu.find('#createGroupsN').click(() => {
			this.createGroupsN(students,);
		});

	}

	public static chooseRandomStudent(students: string[], studentPictures: string[]) {
		const rnd = Math.floor(Math.random() * students.length);
		const randStud = students[rnd];
		const studPic = studentPictures[rnd];
		const htmlString =
			"<div style=\"text-align:center;\"><img style=\"border: 1px solid  gray; border-radius: 5%;margin: 1em 2em\" src=" + studPic + "></img></div>" +
			"<div style=\"text-align:center;\">" + randStud +"</div>";
		const dialog = $("#NiceFeaturesForAktivitetDialog");
		dialog.html(htmlString);
		dialog.dialog({
			modal: true,
			open: () => {
			},
			close: () => {
				dialog.html('');
			}
		});

	}

	public static chooseRandomStudentAnimated(students: string[], studentPictures: string[]) {
		const time = 8000 / students.length - 1;

		const htmlString = this.getAllpicturesHtml(students, studentPictures);
		const dialog = $("#NiceFeaturesForAktivitetDialog");
		dialog.html(htmlString);
		dialog.dialog({
			modal: true,
			open: () => {
				const imgs = $('img', dialog);
				const remaining = imgs;
				this.fade(remaining, time);
			},
			close: () => {
				dialog.html('');
			}

		});

		const w = window.innerWidth;
		const h = window.innerHeight;
		const offset = 50;
		dialog.parent().width(w-2*offset).height(h-2*offset);
		dialog.parent().css({top: offset, left: offset});
	}

	public static createGroups(students: string[], groupSize: number) {
		const shuffled = this.shuffle(students);

		const html = this.getGroupsHtml(shuffled, groupSize);

		const dialog = $("#NiceFeaturesForAktivitetDialog");
		dialog.dialog({ title: "Grupper" });
		dialog.html(html);
		dialog.dialog({
			modal: true,
			open: () => {
			},
			close: () => {
				dialog.html('');
			}
		});
		dialog.css('overflow-y', 'auto');
		dialog.css('max-height', '700px');



	}

	public static createGroupsN(students: string[]) {
		const dialog = $("#NiceFeaturesForAktivitetInputDialog");
		const self = this;

		const html = "<div style=\"margin:2em;\"><label>Gruppestørrelse:</label> <input Width=\"130\" ID=\"groupSize\" type='number'/>";

		dialog.html(html);
		dialog.dialog({
			modal: true,
			open: () => {
			},
			close: () => {
				dialog.html('');
			},
			title: "Vælg gruppestørrelse",
			'buttons': {
				'Generer'() {
					const input = $('#groupSize');
					const groupSize = input.val();
					dialog.dialog('close');
					self.createGroups(students, Number(groupSize));
				}
			}
		});

	}

	private static shuffle(a: string[]) {
		const na = a.slice(0);
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[na[i], na[j]] = [na[j], na[i]];
		}
		return na;
	}

	private static getAllpicturesHtml(students: string[], studentPictures: string[]) : string {
		let html = "<div style=\"text-align: center;\">";

		for (let j = 0; j < studentPictures.length; j++) {
			html += "<img src=" + studentPictures[j] + " style=\"border: 1px solid  gray; border-radius: 5%;margin: 1em 2em\" title=\"" + students[j] + "\"></img>";
		}
		html += "</div>";
		return html;

	}

	private static getGroupsHtml(students: string[], groupSize: number): string {
		let html = "<div style=\"margin:2em 3em;\">";
		let cnt = 0;
		let groupNum = 1;
		html += "<div style\"padding:1em;\"><label> Gruppe " + groupNum + ":</label><ul class=\"standardlist\">";
		for (let j = 0; j < students.length; j++) {
			html += "<li>" + students[j] + "</li>";
			cnt++;
			if (cnt === groupSize && j + 1 < students.length) {
				cnt = 0;
				groupNum++;
				html += "</ul><br/><br/></div><div style\"padding:1em;\"><label> Gruppe " + groupNum + ":</label><ul class=\"standardlist\">";
			}
		}
		html += "</div>";
		return html;
	}

	private static fade(remaining: JQuery, time: number) {
		if (remaining.length <= 1) {
			this.displayWinner(remaining);
			return;
		}

		const rnd = Math.floor(Math.random() * remaining.length);
		const randRem = remaining.eq(rnd);
		remaining = remaining.not(randRem);
		randRem.fadeOut(time, () => {
			this.fade(remaining, time);
		});
	}

	private static displayWinner(remaining: JQuery) {
		if (remaining.length === 1) {
			const winner = remaining.first();

			const winnerName = $("<div>" + winner.attr('title') + "</div>").hide();
			winner.after(winnerName);
			winnerName.slideDown(1000);

		}
	}





}