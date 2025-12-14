import Chart, { ArcElement, ChartData, LegendItem, TooltipItem, TooltipModel } from 'chart.js/auto';
import { LectioJSUtils } from "./LectioJSUtils";
import Annotation, { AnnotationOptions, AnnotationPluginOptions, LineAnnotationOptions } from 'chartjs-plugin-annotation';


declare module 'chart.js' {
	interface PluginOptionsByType<TType> {
		HighligthedIndices: {
			startIndex: number | null,
			endIndex: number | null
		}

		annotation: AnnotationPluginOptions;
	}
}

enum ChartType {
	Bar = 1,
	BarStacked = 2,
	BarGroup = 3,
	Line = 4,
	Pie = 5,
}

// Ækvivalente klasser: lectiograf.cs::DataSet <--> LectioGraf.ts::DataSet
interface DataSet {
	Label: string;
	Data: number[];
	DataTooltipAdditive?: number[];
	DataTooltipAdditiveUnit: string;
	DataTooltipEx: (string | null)[];
	ColorProps: string[] | null;
	DataTooltipUnit: string;
	TooltipLabelTitle: string;
}

// Et saet af `DataSet` der bruger samme x- og y-akser.
// Ækvivalente klasser: lectiograf.cs::DataSeries <--> LectioGraf.ts::DataSeries
interface DataSeries {
	/** Labels for X axis points. */
	Labels: string[]
	/** Additional info for X axis points. */
	LabelsTooltipEx?: string[]
	Datasets: DataSet[];
	ValueAxisRangeFixed?: [min: number, max: number];
	ValueAxisStepSize?: number;
}

// Ækvivalente klasser: lectiograf.cs::ChartStyling <--> LectioGraf.ts::ChartStyling
interface ChartStyling {
	ChartType: ChartType,
	XAxisLabel: string;
	YAxisLabel: string;
	Width: number;
	Height: number;
	BarStacked: boolean;
	EnableAnimations: boolean;
	DisplayLegend: boolean;
	UseDatasetLabelColorsForBarChart: boolean;
	LinePointStyling?: string;
	ShowChartElementValue: boolean;
	DisplayXAxis: boolean;
	DisplayXGridLines: boolean;
	DisplayXBorder: boolean;
	DisplayYAxis: boolean;
	DisplayYGridLines: boolean;
	DisplayYBorder: boolean;
	MaxBarThickness?: number;
	ShowLabelUnderBarChartElement: boolean;
	TooltipTotalText: string;
	TooltipReverseOrder: boolean;
	TooltipShowLabelBox: boolean;
	IsResponsive: boolean;
	BarPercentage: number;
	CategoryPercentage: number;
	BarOrientation: "x" | "y" | undefined;
	ShowTotalToolTip: boolean;
	HorizontalDividerAnnotationConfigs?: HorizontalDividerAnnotationConfig[];
}

interface DataPointForImpl {
	x: number,
	y: number,
	extraInfo: {
		tooltip?: string;
	}
}

// Ækvivalente klasser: lectiograf.cs::HorizontalDividerAnnotationConfig <--> LectioGraf.ts::HorizontalDividerAnnotationConfig
interface HorizontalDividerAnnotationConfig {
  XValue: number;
  Label: string;
}

function getHorizontalDividerAnnotation(config: HorizontalDividerAnnotationConfig, chartType: ChartType): LineAnnotationOptions {
	const xValue = () => {
		switch (chartType) {
			case ChartType.Bar:
			case ChartType.BarGroup:
			case ChartType.BarStacked:
				return config.XValue - 0.5;
			case ChartType.Line:
				return config.XValue;
			default:
				throw new Error("Det er kun muligt at tilfoeje horizontalDividers for line- og barchart: " + chartType);
		}
	}

	const annotation: LineAnnotationOptions = {
			xMin: xValue(),
			xMax: xValue(),
			yMin: (ctx) => {
				const scale = ctx.chart.scales.y;
				return scale.max;
			},
			yMax: (ctx) => {
				const scale = ctx.chart.scales.y;
				const range = scale.max - scale.min;
				return scale.max - (range * 1); // 20% down
			},
			borderColor: 'rgba(0, 0, 0, 0.4)',
			borderWidth: 1,
			drawTime: 'beforeDatasetsDraw',
		};

		annotation.label = {
			content: config.Label,
			display: true,
			position: 'start',

			xAdjust: 20,
			yAdjust: 0, 

			font: {
				size: 10,
				style: 'italic'
			},
			color: 'rgba(41, 41, 41, 0.8)',

			backgroundColor: 'rgba(255, 255, 255, 0.2)',
			padding: {
				top: 2,
				bottom: 2,
				left: 4,
				right: 4
			},
		};
		
	return annotation;


}

function getAnnotation(chartStyling: ChartStyling): AnnotationPluginOptions {
	const annotations: AnnotationOptions[] = [];
	chartStyling.HorizontalDividerAnnotationConfigs?.forEach(c => annotations.push(getHorizontalDividerAnnotation(c, chartStyling.ChartType) as AnnotationOptions))
	return { annotations: annotations };
}

const BORDER_COLORS = [
	'oklch(70% 0.118 250.74)', // custom1
	'oklch(70% 0.136 28.28)', // custom2
	'oklch(70% 0.130 124.23)', // custom3
	'oklch(70% 0.131 98.47)', // custom4
	'oklch(70% 0.173 61.33)', // custom5
	'oklch(70% 0.131 303.71)', // custom6
	'oklch(70% 0.120 215.55)', // custom8
	'oklch(70% 0 0)', // - gray

	'oklch(80% 0.118 250.74)', // custom1
	'oklch(80% 0.136 28.28)', // custom2
	'oklch(80% 0.130 124.23)', // custom3
	'oklch(80% 0.131 98.47)', // custom4
	'oklch(80% 0.173 61.33)', // custom5
	'oklch(80% 0.131 303.71)', // custom6
	'oklch(80% 0.120 215.55)', // custom8
	'oklch(80% 0 0)', // - gray

	'oklch(55% 0.118 250.74)', // custom1
	'oklch(55% 0.136 28.28)', // custom2
	'oklch(55% 0.130 124.23)', // custom3
	'oklch(55% 0.131 98.47)', // custom4
	'oklch(55% 0.173 61.33)', // custom5
	'oklch(55% 0.131 303.71)', // custom6
	'oklch(55% 0.120 215.55)', // custom8
	'oklch(55% 0 0)', // - gray


];

const HARDCODED_COLORS: { [label: string]: string | undefined } = {

	// Uddannelseskategorier 

	'BRO': 'oklch(59.818% 0 none)', // gray
	'Brobyg (11010v1)': 'oklch(59.818% 0 none)', // gray
	'10KL': 'oklch(88.287% 0.163 104.07)', // yellow
	'11020v1': 'oklch(82.776% 0.144 90.114)', // darker yellow - måske omdøbes til GRUND
	'GRUND': 'oklch(82.776% 0.144 90.114)', // darker yellow
	'FGU': 'oklch(80.544% 0 none)', // lightgray


	'IB': 'oklch(66.461% 0.181 52.761)', // orange
	'IBv2': 'oklch(66.461% 0.181 52.761)', // orange	
	'Pre-IB': 'oklch(83.622% 0.195 55.771)', // orange
	'Pre-IBv2': 'oklch(83.622% 0.195 55.771)', // orange
	'IB/pre-IB': 'oklch(83.622% 0.195 55.771)', // orange

	'EB': 'oklch(67.043% 0.171 49.143)', // darker orange

	'GIF': 'oklch(81.127% 0.060 18.456)', // pink

	'VUC': 'oklch(88.817% 0.052 196.25)', // lightturkish
	'VUC (OBU, FVU, AVU, Hfe)': 'oklch(88.817% 0.052 196.25)', // lightturkish
	'Stat.pr.': 'oklch(37.054% 0 none)', // darkgray
	'DU': 'oklch(88.287% 0.163 104.07)', // yellow
	'Danskudd (2542v1)': 'oklch(88.287% 0.163 104.07)', // yellow



	'GUEUD': 'oklch(45% 0.133 305)', // purple
	'GU EUD': 'oklch(45% 0.133 305)', // purple
	'GUOPK': 'oklch(88.817% 0.052 196.25)', // lightturkish
	'GUUNI': 'oklch(72.695% 0.142 53.787)', // orange
	'2121v1': 'oklch(37.054% 0 none)', // darkgray - måske omdøbes til Bro.K
	'Bro.K': 'oklch(37.054% 0 none)', // darkgray
	'3554v2': 'oklch(37.798% 0.093 262.74)', // darkblue  - htx enkeltfag måske omdøbes til HTXe

	/* Fravær */
	'percentile: < 5%': 'oklch(86.204% 0.138 129.26)',
	'percentile: < 5%; relyear: -1': 'oklch(76.204% 0.138 129.26)',
	'percentile: 5-10%': 'oklch(91.204% 0.138 83.448)',
	'percentile: 5-10%; relyear: -1': 'oklch(81.204% 0.138 83.448)',
	'percentile: 10-15%': 'oklch(83.622% 0.195 55.771)',
	'percentile: 10-15%; relyear: -1': 'oklch(73.622% 0.195 55.771)',
	'percentile: >= 15%': 'oklch(58.843% 0.217 23.076)',
	'percentile: >= 15%; relyear: -1': 'oklch(48.843% 0.217 23.076)',

	'Fravær %': 'oklch(48.843% 0.217 23.076)',


	/* År, årgange */
	'relyear: 0': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 1; relyear: 0': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 2; relyear: 0': 'oklch(75% 0.120 215.55)', // custom8 level 4
	'aargang: 3; relyear: 0': 'oklch(65% 0.120 215.55)', // custom8 level 3
	'aargang: 4; relyear: 0': 'oklch(55% 0.120 215.55)', // custom8 level 4
	'relyear: -1': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 1; relyear: -1': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 2; relyear: -1': 'oklch(75% 0.120 215.55)', // custom8 level 4
	'aargang: 3; relyear: -1': 'oklch(65% 0.120 215.55)', // custom8 level 3
	'aargang: 4; relyear: -1': 'oklch(55% 0.120 215.55)', // custom8 level 4
	'relyear: -2': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 1; relyear: -2': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'aargang: 2; relyear: -2': 'oklch(75% 0.120 215.55)', // custom8 level 4
	'aargang: 3; relyear: -2': 'oklch(65% 0.120 215.55)', // custom8 level 3
	'aargang: 4; relyear: -2': 'oklch(55% 0.120 215.55)', // custom8 level 4


	// midlertidigt hardkodning for årstal - bedre løsning skal findes
	'2019': 'oklch(100% 0.120 215.55)', // custom8 level 7
	'2020': 'oklch(90% 0.120 215.55)', // custom8 level 6
	'2021': 'oklch(75% 0.120 215.55)', // custom8 level 5
	'2022': 'oklch(60% 0.120 215.55)', // custom8 level 4
	'2023': 'oklch(45% 0.120 215.55)', // custom8 level 3
	'2024': 'oklch(30% 0.120 215.55)', // custom8 level 2
	'2025': 'oklch(15% 0.120 215.55)', // custom8 level 1
	'2026': 'oklch(100% 0.120 215.55)', // custom8 level 7


	// månederne 
	'jan': 'oklch(72% 0.120 215.55)',
	'feb': 'oklch(70% 0.120 215.55)',
	'mar': 'oklch(68% 0.120 215.55)',
	'apr': 'oklch(66% 0.120 215.55)',
	'maj': 'oklch(64% 0.120 215.55)',
	'jun': 'oklch(62% 0.120 215.55)',
	'jul': 'oklch(60% 0.120 215.55)',
	'aug': 'oklch(58% 0.120 215.55)',
	'sep': 'oklch(56% 0.120 215.55)',
	'okt': 'oklch(54% 0.120 215.55)',
	'nov': 'oklch(52% 0.120 215.55)',
	'dec': 'oklch(50% 0.120 215.55)',



	//'STX': 'oklch(47.431% 0.136 14.152)', // bourdoux
	'STX': 'oklch(45% 0.13 14)', // bourdoux
	'STXv2': 'oklch(45% 0.13 14)', // bourdoux
	'STX SP': 'oklch(71.707% 0.114 9.598)', // bourdoux
	//'STX TD': 'oklch(71.707% 0.114 9.598)', // bourdoux
	'STX TD': 'oklch(49.94% 0.13 146.22)', // green
	//'STXv2 4 årig Team Danmark': 'oklch(71.707% 0.114 9.598)', // bourdoux
	'STXv2 4 årig Team Danmark': 'oklch(49.94% 0.13 146.22)', // green
	'STX MGK': 'oklch(71.707% 0.114 9.598)', // bourdoux
	'STK': 'oklch(55.652% 0.163 14.423)', // bourdoux
	'Studenterkursus (3021)': 'oklch(55.652% 0.163 14.423)', // bourdoux light
	'Studenterkursus': 'oklch(55.652% 0.163 14.423)', // bourdoux light
	'StudKurs': 'oklch(55.652% 0.163 14.423)', // bourdoux light
	'Studentereksamen, STX': 'oklch(47.431% 0.136 14.152)', // bourdoux
	'GSK': 'oklch(72.219% 0.094 8.818)',// bourdoux lighter
	'GSKv2 - Gymnasial supplering (GS)': 'oklch(72.219% 0.094 8.818)',// bourdoux lighter
	'GSK-kurser (3007)': 'oklch(72.219% 0.094 8.818)',// bourdoux lighter
	'GUSTX': 'oklch(45% 0.13 14)', // bourdoux
	'GU STX (11001v1)': 'oklch(45% 0.13 14)', // bourdoux
	'GYM': 'oklch(55% 0.13 14)', // bourdoux

	'HF': 'oklch(82.953% 0.077 248.77)', // lightblue
	'HFv2 2 årig +': 'oklch(82.953% 0.077 248.77)', // lightblue	
	'HF Enkeltfag v1': 'oklch(91.763% 0.022 248.07)', // lightblue
	'HF Enkeltfag v2': 'oklch(91.763% 0.022 248.07)', // lightblue
	'HF SP': 'oklch(87.474% 0.040 248.29)', // lightblue
	'HF TD': 'oklch(87.474% 0.040 248.29)', // lightblue
	'HFv2 3 årig Team Danmark': 'oklch(87.474% 0.040 248.29)', // lightblue
	'HF MGK': 'oklch(87.474% 0.040 248.29)', // lightblue
	'HF SOF v1': 'oklch(82.953% 0.077 248.77)', // lightblue


	'HHX': 'oklch(49.937% 0.130 262.64)', // blue
	'HHXv4': 'oklch(49.937% 0.130 262.64)', // blue
	//'HHX TD': 'oklch(49.937% 0.130 262.64)', // blue
	'HHX TD': 'oklch(49.94% 0.130 128.12)', // green
	//'HHXv4 4 årig Team Danmark': 'oklch(49.937% 0.130 262.64)', // blue
	'HHXv4 4 årig Team Danmark': 'oklch(49.94% 0.130 128.12)', // green
	'Højere handelseksamen, HHX': 'oklch(49.937% 0.130 262.64)', // blue
	'3516': 'oklch(49.937% 0.130 262.64)', // blue - hhx enkeltfag omdøbes til HHXe
	'HHXe': 'oklch(49.937% 0.130 262.64)', // blue


	'HTX': 'oklch(37.798% 0.093 262.74)', // darkblue
	'HTXv4': 'oklch(37.798% 0.093 262.74)', // darkblue
	//'HTX TD': 'oklch(37.798% 0.093 262.74)', // darkblue
	'HTX TD': 'oklch(49.94% 0.13 140.88)', // green
	'Højere teknisk eksamen, HTX': 'oklch(37.798% 0.093 262.74)', // darkblue
	'HTXe': 'oklch(37.798% 0.093 262.74)', // darkblue



	'ÅU': 'oklch(72.695% 0.142 53.787)', // orange omdøbes til AMU
	'AMU': 'oklch(72.695% 0.142 53.787)', // orange
	'AMU/IDV/ÅU': 'oklch(72.695% 0.142 53.787)', // orange

	'EUD10v1': 'oklch(88.287% 0.163 104.07)', // yellow
	'EUD Andre': 'oklch(59.818% 0 none)', // gray
	'Andre': 'oklch(80.544% 0 none)', // lightgray
	'Brobygning': 'oklch(37.054% 0 none)', // darkgray


	'AVU': 'oklch(83.5% 0.076 195.8)', // lightturkish
	'OBU': 'oklch(79.005% 0.108 56.01)', // orange 
	'FVU': 'oklch(82.776% 0.144 90.114)', // darker yellow
	'FGU med hf-fagelementer 1063': 'oklch(83.452% 0.045 248.37)', // lightblue
	'FGU med EUD-fagelementer 1062 (AGU/PGU)': 'oklch(60% 0.133 305)', // purple

	'10. klasse v1': 'oklch(88.287% 0.163 104.07)', // yellow
	'10. klasse v2': 'oklch(88.287% 0.163 104.07)', // yellow
	'10 klasse': 'oklch(88.287% 0.163 104.07)', // yellow
	'Danskuddannelsen': 'oklch(88.287% 0.163 104.07)', // yellow

	'GIFv3': 'oklch(81.127% 0.060 18.456)', // pink

	'EUD HF Prereform': 'oklch(45% 0.133 305)', // purple
	'EUD HF': 'oklch(45% 0.13 305)', // purple
	'EUD GF2': 'oklch(70% 0.13 305)', // purple
	'EUD GF1': 'oklch(85% 0.13 305)', // purple
	'GF2': 'oklch(70% 0.13 305)', // purple
	'GF1': 'oklch(85% 0.13 305)', // purple

	'EUD Teknisk GF': 'oklch(70% 0.13 305)', // purple
	'EUD Merkantil GF': 'oklch(85% 0.13 305)', // purple

	'EUD Teknisk HF': 'oklch(45% 0.13 305)', // purple
	'EUD Merkantil HF': 'oklch(60% 0.13 305)', // purple

	'EUD Teknisk': 'oklch(45% 0.13 305)', // purple
	'EUD Merkantil': 'oklch(60% 0.13 305)', // purple

	// Hovedforløb - Skoleoplæring	
	'Hovedforløbselever': 'oklch(45% 0.133 305)', // purple
	'Hovedforløb': 'oklch(45% 0.133 305)', // purple
	'EUD HF Elever': 'oklch(45% 0.133 305)', // purple
	'Skoleoplæring': 'oklch(75% 0.133 305)', // purple



	// Elevtilgang og afgang
	'Frafald': 'oklch(68.55% 0.197 28.317)', // custom260 - red
	'Gennemført': 'oklch(64.998% 0.125 124.82)', // - custom360 - green
	'Gennemført GF2': 'oklch(64.998% 0.125 124.82)', // - custom360 - green
	'Tilgang': 'oklch(82.139% 0.133 123.77)', // custom380 - green
	'Tilgang GF2': 'oklch(82.139% 0.133 123.77)', // custom380 - green

	// Elevfrafald
	'Ej mødt/ans.tru': 'oklch(56.946% 0.150 81.925)',
	'Ej bestået': 'oklch(76.038% 0.219 24.362)',
	'Bortvist': 'oklch(23.174% 0.085 23.701)',
	'Faglige krav': 'oklch(58.843% 0.217 23.076)',
	'Udd. Skift': 'oklch(91.204% 0.138 83.448)',
	'Private årsager': 'oklch(49.718% 0.164 23.751)',
	'Inst. Skift': 'oklch(92.759% 0.167 25.621)',
	'Ingen kontakt': 'oklch(48.517% 0.072 57.978)',
	'Afb. Udveksling': 'oklch(83.622% 0.195 55.771)',
	'Orlov': 'oklch(84.081% 0.211 43.903)',
	'Elev bortgået': 'oklch(32.003% 0.092 3.478)',
	'Ophørt lærefor.': 'oklch(70.273% 0.170 67.654)',

	//cirkeldiagram 
	'Rest': 'oklch(82.139% 0.133 123.77)',


	// Køn, elever
	'Kvinde': 'oklch(84% 0.09 355)', // light red
	'Mand': 'oklch(84% 0.09 255)', // light blue
	'K': 'oklch(84% 0.09 355)', // light red
	'M': 'oklch(84% 0.09 255)', // light blue
	'Hunkøn': 'oklch(84% 0.09 355)', // light red
	'Hankøn': 'oklch(84% 0.09 255)', // light blue
	'Sps': 'oklch(84% 0.09 95)', //
	'SPS': 'oklch(84% 0.09 95)', // 
	'Samlede ansøgertal': 'oklch(84% 0.09 175)', // light green
	'Total': 'oklch(84% 0.09 175)', //  light green
	'Alle': 'oklch(84% 0.09 175)', //  light green

	/*********************************************** */
	/*	Uddannelsesaftaler*/
	'Rest aftale': 'oklch(82.139% 0.133 123.77)',
	'Kort aftale': 'oklch(75% 0.120 215.55)', // custom8 level 3
	'Ordinær aftale': 'oklch(60% 0.120 215.55)', // custom8 level 4
	'Delaftale i kombaftale': 'oklch(75% 0.173 61.33)', // custom5
	'Delaftale u. skoleoplaering': 'oklch(65% 0.136 28.28)', // custom2

	'Aftale indgået inden 3 Mdr': 'oklch(85% 0.120 215.55)', // custom8 level 3
	'Aftale indgået inden 6 Mdr': 'oklch(75% 0.120 215.55)', // custom8 level 4
	'Aftale indgået inden 9 Mdr': 'oklch(65% 0.120 215.55)', // custom8 level 3
	'Aftale indgået': 'oklch(55% 0.120 215.55)', // custom8 level 4

	/*********************************************** */

	/* 	Karakterer */
	'STA/MDT': 'oklch(75% 0.173 61.33)', // custom5
	'EKS/MDT': 'oklch(55% 0.173 61.33)', // custom5 
	'STA/SKR': 'oklch(75% 0.120 215.55)', // custom8 
	'EKS/SKR': 'oklch(55% 0.120 215.55)', // custom8


	/*********************************************** */

	/* Trivsel ********************************************** */
	//'EgenSkole': 'oklch(75% 0.120 30)', // light red
	'EgenSkole': 'oklch(82.139% 0.133 123.77)', // light green
	'Landsgennemsnit': 'oklch(75% 0.120 215.55)', // light blue custom8 level 5
	'Virksomhedernes oplevelse af eleverne': 'oklch(75% 0.120 215.55)', // custom8 level 3
	'Virksomhedens oplevelse af samarbejdet med skolen': 'oklch(60% 0.120 215.55)', // custom8 level 4
	'Faglig individuel trivsel': 'oklch(75% 0.120 215.55)', // custom8 - 'oklch(70% 0.131 98.47)', // custom4
	'Social trivsel': 'oklch(70% 0.131 303.71)', // custom6
	'Læringsmiljø': 'oklch(65% 0.118 250.74)', // custom1
	'Pres og bekymringer': 'oklch(75% 0.173 61.33)', // custom5
	'Mobning': 'oklch(65% 0.136 28.28)', // custom2


	/*********************************************** */
	'Tilskud': 'oklch(0.63 0.121 248)',

	// Tidsregistrering
	'Arbejde': 'oklch(0.63 0.121 248)',
	'Helligdag': 'oklch(0.84 0 0)',
	'Ferie': 'oklch(0.63 0 0)',
	'Sygdom': 'oklch(0.63 0.205 27.06)',
	'Barns sygdom': 'oklch(0.76 0.145 27.06)',
	'Omsorgsdag': 'oklch(0.92 0.042 25.226)',
	'Afspadsering': 'oklch(0.63 0.121 135)',
	'Barsel': 'oklch(0.82 0.121 135)',
	/********************************************* */
	'Andet': 'oklch(84% 0.09 95)', // brown yellow
	'Ukendt': 'oklch(84% 0.09 95)', // brown yellow
	'U': 'oklch(84% 0.09 95)', // brown yellow
	'Nej': 'oklch(0.7018% 0.133 21.9)', // red
	'Ja': 'oklch(82.139% 0.133 123.77)', // green
	'(blank)': 'oklch(80.544% 0 none)', // lightgray
};

const determinedColors: { [label: string]: string | undefined } = {};
let determinedColorCount = 0;
function getColorForDataset(label: string | Pick<DataSet, 'ColorProps' | 'Label'>): string {
	let strx: string;

	if (typeof label === 'string') {
		const c2 = HARDCODED_COLORS[label];
		if (c2)
			return c2;

		strx = label;
	} else {
		{
			const c1 = HARDCODED_COLORS[label.Label];
			if (c1)
				return c1;
		}
		if (label.ColorProps?.length) {
			const arr = [...label.ColorProps];
			arr.sort();
			const keys = [arr.join('; '), ...arr];
			for (const key of keys) {
				const c2 = HARDCODED_COLORS[key];
				if (c2)
					return c2;
			}
		}
		strx = label.Label;
	}
	{
		const c1 = determinedColors[strx];
		if (c1)
			return c1;

		const idx = determinedColorCount++;
		const color = BORDER_COLORS[idx % BORDER_COLORS.length];
		determinedColors[strx] = color;

		return color;
	}
}

export namespace GraphBuilder {
	export function Initialize(canvasId: string, chartStyling: ChartStyling, data: DataSeries): void {
		
		RegisterPlugins();

		const chartEle = document.getElementById(canvasId);
		if (chartEle instanceof HTMLCanvasElement) {
			const chart = Chart.getChart(chartEle);
			chart?.destroy();
		}
		data.Datasets.forEach(dataset => {
			if (dataset.DataTooltipEx != null && dataset.DataTooltipEx.length != 0 && dataset.DataTooltipEx.length != dataset.Data.length)
				throw new Error('DataTooltipArray has value, but is not the same lenght as the dataArray');
		})

		switch (chartStyling.ChartType) {
			case ChartType.Bar: {
				LectioJSUtils.AssertType(chartEle, HTMLCanvasElement);
				createBar(chartEle, chartStyling, data);
				break;
			}
			case ChartType.BarStacked: {
				LectioJSUtils.AssertType(chartEle, HTMLCanvasElement);
				chartStyling.BarStacked = true;
				createBar(chartEle, chartStyling, data);
				break;
			}
			case ChartType.BarGroup: {
				LectioJSUtils.AssertType(chartEle, HTMLCanvasElement);
				createBar(chartEle, chartStyling, data);
				break;
			}
			case ChartType.Line: {
				LectioJSUtils.AssertType(chartEle, HTMLCanvasElement);
				createLine(chartEle, chartStyling, data);
				break;
			}
			case ChartType.Pie: {
				LectioJSUtils.AssertType(chartEle, HTMLCanvasElement);
				createPie(chartEle, chartStyling, data);
				break;
			}
			default:
				LectioJSUtils.AssertNever(chartStyling.ChartType, 'type');
		}
	}

	function RegisterPlugins() {
		Chart.register(Annotation);
	}

	// used to color the label box in the same color as the chart
	export function GetColorForLabels(): void {
		$(document).ready(() => {
			const labelBoxes = document.querySelectorAll("span.ansoeger-pi-char-labels");

			labelBoxes.forEach(span => {
				const next = span.nextElementSibling;

				if (next && next instanceof HTMLElement) {
					const label = next.innerText.trim();
					const color = HARDCODED_COLORS[label];

					if (color) {
						(span as HTMLElement).style.backgroundColor = color;
					}
				}
			});
		});
	}
}

function updateChartTooltip(tooltip: TooltipModel<any>) {
	(tooltip as any).update();
}

const CreateTooltip = (chart: Chart): HTMLDivElement => {
	LectioJSUtils.AssertNotNullOrUndefined(chart, "Chart is null");
	const canvasparentelement = document.body;

	let tooltipElement = canvasparentelement.querySelector('#chrtTooltipId');
	if (tooltipElement)
		LectioJSUtils.AssertType(tooltipElement, HTMLDivElement);

	if (!tooltipElement) {
		const newe = document.createElement('div');
		newe.classList.add('ls-diagram-tooltip-custom');
		newe.id = "chrtTooltipId";
		newe.appendChild(document.createElement('table'));

		tooltipElement = newe;
		LectioJSUtils.AssertType(tooltipElement, HTMLDivElement);
		canvasparentelement.appendChild(tooltipElement);
	}
	else
		tooltipElement.className = 'ls-diagram-tooltip-custom';

	return tooltipElement;
};

const externalTooltipHandler = (
	context: {
		chart: Chart; tooltip: TooltipModel<any>
	},
	data: DataSeries,
	chartStyling: ChartStyling) => {
	// Tooltip Element + Chart
	const { chart, tooltip } = context;
	const tooltipElement = CreateTooltip(chart);

	// Hide if no tooltip
	if (tooltip.opacity === 0) {
		tooltipElement.style.opacity = "0";
		return;
	}
	const enc = (text: string) => text.replace('&', '&amp;').replace('<', '&lt;')

	// Set Text
	if (tooltip.body) {
		const tableInnerHtmlParts: string[] = [];

		// Get the index of the hovered value.
		// info: De dataPoints vi faar her, kommer fra chart._active, vist ret direkte.
		// TODO: Virker ikke på diagrammer med overlappende data evt. multi-scatter charts. 
		const dataIndex = tooltip.dataPoints[0].dataIndex;

		//Get the tooltip dataset Colors and Values. 
		let dataSetsValuesAndColors: { label: string, value: number, color: string, highlight: boolean, unit: string, DataTooltipAdditive: number | undefined, DataTooltipAdditiveUnit: string, tooltipExtra: string | null | undefined }[] = [];
		{
			// For Pie charts viser vi alt data.
			if (chartStyling.ChartType === ChartType.Pie) {
				const labelsList = chart.data.labels as ArrayLike<string> | undefined;
				LectioJSUtils.AssertNotNullOrUndefined(labelsList, 'labelsList');
				LectioJSUtils.AssertArgument(chart.data.datasets.length == 1, 'PieCharts maa kun have ét dataset');

				dataSetsValuesAndColors = chart.data.datasets
					.map((dataset, datasetIndex) => {
						const colorList = dataset.backgroundColor as ArrayLike<string> | undefined
						LectioJSUtils.AssertNotNullOrUndefined(colorList, 'colorList');
						const valuesAndColors = dataset.data
							.mapNotNull((value, index) => {
								if (!chart.getDataVisibility(index))
									return null;
								const label = labelsList[index];
								const color = colorList[index];
								const DataTooltipAdditive = data.Datasets[datasetIndex].DataTooltipAdditive?.[index];
								const DataTooltipAdditiveUnit = data.Datasets[datasetIndex].DataTooltipAdditiveUnit ?? "";
								const tooltipUnit = data.Datasets[datasetIndex].DataTooltipUnit ?? "";
								const tooltipExtra = data.Datasets[datasetIndex].DataTooltipEx?.[index];
								if (value == null)
									return null;
								if (typeof value !== 'number')
									throw new Error('Value er ikke null|number.');
								LectioJSUtils.AssertNotNullOrEmpty(label, 'label');
								return {label, value, color, highlight: index === dataIndex, unit: tooltipUnit, DataTooltipAdditive: DataTooltipAdditive, DataTooltipAdditiveUnit: DataTooltipAdditiveUnit, tooltipExtra: tooltipExtra };
							});
						return valuesAndColors;
					})
					.flat();
			}

			// For Bar- Line charts viser vi data ift. den hovered vaerdi. 
			else {
				// line charts giver alle dataset for aktuel x-akse-punkt, hvilket ikke er saa interessant, informativt at highlighte.
				// TODO find ud af/naar der er eet dataset der er hoveret. Det indbyggede tooltip kan godt finde ud af det.
				const datasetIndex = chartStyling.ChartType === ChartType.Line ? -1 : tooltip.dataPoints[0].datasetIndex;
				dataSetsValuesAndColors = chart.data.datasets
					.filter((_, idx) => chart.isDatasetVisible(idx))
					.mapNotNull((dataset, idx) => {
						const tooltipLabelTitle = data.Datasets[idx].TooltipLabelTitle;
						const value = dataset.data[dataIndex];
						const unit = data.Datasets[idx].DataTooltipUnit ?? "";
						const color = dataset.backgroundColor?.toString() ?? "";
						const DataTooltipAdditive = data.Datasets[idx].DataTooltipAdditive?.[dataIndex];
						const DataTooltipAdditiveUnit = data.Datasets[idx].DataTooltipAdditiveUnit ?? "";
						const tooltipExtra = data.Datasets[idx].DataTooltipEx?.[idx] ?? "";

						if (value == null)
							return null;
						if (typeof value !== 'number')
							throw new Error('Value er ikke null|number.');
						LectioJSUtils.AssertNotNullOrEmpty(tooltipLabelTitle, 'label');
						return {label: tooltipLabelTitle, value, color, highlight: datasetIndex === idx, unit: unit, DataTooltipAdditive: DataTooltipAdditive, DataTooltipAdditiveUnit: DataTooltipAdditiveUnit, tooltipExtra: tooltipExtra };
					});
			}
		}

		// Tilføj header information. 
		{
			tableInnerHtmlParts.push('<thead>');
			const titleLines: readonly string[] = tooltip.title || [];
			// "mar 25", "HHX": x-akse-titel
			tableInnerHtmlParts.push(titleLines.map(t => '<tr><th>' + enc(t) + '</th></tr>').join(''));
			// Dette er f.eks. Opgørelsesdato: [dato]
			if (data.LabelsTooltipEx != null) {
				const text = data.LabelsTooltipEx[dataIndex];
				if (text !== "")
					tableInnerHtmlParts.push(text);
			}
			tableInnerHtmlParts.push('</thead>');
		}

		// Tilføj total, colorboxes og vaerdi i tooltip body
		{
			tableInnerHtmlParts.push('<tbody>');
			// Flg. er fx. "Total: 8 unit (100 addUnit)"
			if (chartStyling.ShowTotalToolTip) {
				const dataSum = dataSetsValuesAndColors.reduce((acc, val) => acc + (val.value as number), 0)
				const dataUnit = IsTheSameUnitInArray(dataSetsValuesAndColors.map(r => r.unit));

				const filteredDataAdditive = dataSetsValuesAndColors.filter(r => r.DataTooltipAdditive !== undefined);
				const dataAdditiveSum = filteredDataAdditive.length > 0 ?
					filteredDataAdditive.reduce((acc, val) => acc + (val.DataTooltipAdditive as number), 0)
					: null;
				const dataAdditiveUnit = IsTheSameUnitInArray(dataSetsValuesAndColors.map(r => r.DataTooltipAdditiveUnit));

				const sumTrElement = `
					<tr>
						<td style= 'padding-top: 5px'>${chartStyling.TooltipTotalText}: </td>
					${dataAdditiveSum != null
						? `<td style='text-align: right;'></td>
						<td style='text-align: right;'>(${enc(dataAdditiveSum.toLocaleString("da-DK", { maximumFractionDigits: 2 }))} ${dataAdditiveUnit})</td>`
						: `<td style='text-align: right;'>${enc(dataSum.toLocaleString("da-DK", { maximumFractionDigits: 2 }))} ${dataUnit}</td>`
					}
					</tr>`
				tableInnerHtmlParts.push(sumTrElement);

				function IsTheSameUnitInArray(arr: string[]): string | null {
					if (arr.length === 0)
						return null;
					if (arr.every(value => value !== arr[0]))
						return null;
					return arr[0];
				}
			}
			tableInnerHtmlParts.push('<tr style="height: 10px"></tr>');
			//const rev = chartStyling.ChartType === ChartType.Bar && chartStyling.Stacked;
			if (chartStyling.TooltipReverseOrder)
				dataSetsValuesAndColors.reverse();
			tableInnerHtmlParts.push(dataSetsValuesAndColors
				.map(r => {
					const hightlight = r.highlight
						? 'style="background-color: #7b7b7b;"'
						: '';
					const colorbox = chartStyling.TooltipShowLabelBox
						? `<span class=ls-diagram-colorbox style="background: ${r.color}; border-color: ${r.color}"></span>`
						: '';
					let toolTipBody = `
					<tr ${hightlight}>
					<td>${colorbox}${r.label + ': '}</td>
					<td style='text-align: right;'>${r.value?.toLocaleString()} ${r.unit} </td>
					${r.DataTooltipAdditive != null
							? `<td style='text-align: right;'>(${r.DataTooltipAdditive?.toLocaleString()} ${r.DataTooltipAdditiveUnit})</td>`
							: ``
						}
					</tr>`
					if (r.tooltipExtra != null)
						toolTipBody = toolTipBody +
							`${r.tooltipExtra}`;
					return toolTipBody;
				})
				.join('')
			);
			tableInnerHtmlParts.push('</tbody>');
		}

		const tableRoot = tooltipElement.querySelector('table');
		LectioJSUtils.AssertNotNullOrUndefined(tableRoot, 'table');
		tableRoot.innerHTML = tableInnerHtmlParts.join('');
	}

	const extraSpace = 15;

	const position = chart.canvas.getBoundingClientRect();
	switch (tooltip.xAlign) {
		case 'left':
			tooltipElement.style.left = (position.left + tooltip.caretX + window.scrollX + extraSpace + tooltipElement.clientWidth / 2) + 'px';
			tooltipElement.classList.add('ls-diagram-triangle-position-left');
			break;
		case 'center':
			tooltipElement.style.left = (position.left + tooltip.caretX + window.scrollX) + 'px';
			break;
		case 'right':
			tooltipElement.style.left = (position.left + tooltip.caretX + window.scrollX - extraSpace - tooltipElement.clientWidth / 2) + 'px';
			tooltipElement.classList.add('ls-diagram-triangle-position-right');
			break;
		default:
			throw new Error("xAlign har ingen vaerdi");
	}

	switch (tooltip.yAlign) {
		case 'top':
			tooltipElement.style.top = (position.top + tooltip.caretY + window.scrollY + extraSpace) + 'px';
			tooltipElement.classList.add('ls-diagram-triangle-position-top');
			break;
		case 'center':
			tooltipElement.style.top = (position.top + tooltip.caretY + window.scrollY - tooltipElement.clientHeight / 2) + 'px';
			break;
		case 'bottom':
			tooltipElement.style.top = (position.top + tooltip.caretY + window.scrollY - extraSpace - tooltipElement.clientHeight) + 'px';
			tooltipElement.classList.add('ls-diagram-triangle-position-bottom');
			break;
		default:
			throw new Error("yAlign har ingen vaerdi");
	}

	// Display the tooltip.
	tooltipElement.style.opacity = "1";
};

function createPie(chartEle: HTMLCanvasElement, chartStyling: ChartStyling, data: DataSeries) {
	const cd = {
		labels: data.Labels,
		datasets: data.Datasets.map(ds => {
			return {
				label: ds.Label, data: ds.Data,
				backgroundColor: data.Labels.map(label => getColorForDataset(label)),
				borderWidth: 0,
				animation: chartStyling.EnableAnimations ? undefined : false,
			};
		})
	} satisfies ChartData;

	new Chart(chartEle, {
		type: 'pie',
		data: cd,
		options: {
			maintainAspectRatio: false,
			layout: {
				padding: 0,
			},
			plugins: {
				legend: {
					display: chartStyling.DisplayLegend,
					position: 'bottom',
					align: 'center',
					labels: { boxWidth: 12, padding: 12 },
					// Vis tooltip for/over slice naar signaturforklaringelement hoveres.
					onHover: (event, legendItem, legend) => {
						const chart = legend.chart;
						const tooltip = chart.tooltip;
						LectioJSUtils.AssertNotNullOrUndefined(tooltip, 'tooltip');

						// Find dataset and index
						const dataIndex = legendItem.index;
						LectioJSUtils.AssertNotNullOrUndefined(dataIndex, 'dataIndex');

						// Set tooltip active elements
						tooltip.setActiveElements([{ datasetIndex: 0, index: dataIndex }], { x: 0, y: 0 });
						chart.canvas.style.cursor = 'pointer';
						updateChartTooltip(tooltip);

						chart.draw();


					},
					onLeave: (event, legendItem, legend) => {
						const chart = legend.chart;
						const tooltip = chart.tooltip;
						LectioJSUtils.AssertNotNullOrUndefined(tooltip, 'tooltip');
						tooltip.setActiveElements([], { x: 0, y: 0 });
						updateChartTooltip(tooltip);
						chart.canvas.style.cursor = 'default';
						chart.draw();
					},
				},
				tooltip: {
					enabled: false,
					external: context => {
						externalTooltipHandler(context, data, chartStyling);
					},
				},
			},
			scales: {

			},

			responsive: chartStyling.IsResponsive,
		},
		plugins: [{
			id: 'ShowValueInPieSlicesPlugin',
			afterDatasetDraw: chart => {

				if (!chartStyling.ShowChartElementValue)
					return;

				const ctx = chart.ctx;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillStyle = '#fff';
				ctx.font = '0.9em Roboto';

				chart.data.datasets.forEach((dataset, i) => {
					const meta = chart.getDatasetMeta(i);
					if (meta.hidden || dataset.hidden)
						return;

					// Data kan have forskellige datatyper baseret på den bestemte chart.
					// For piechart vil det vaere et array af numbers.
					const total = dataset.data.reduce((acc, curr) => (typeof acc === 'number' ? acc : 0) + (typeof curr === 'number' ? curr : 0), 0) as number;
					meta.data.forEach((element, index) => {
						const arc = element as ArcElement;
						const mid_radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.7;
						const mid_angle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;

						// Hvis lagkagestykket er hidden, viser vi ikke noget i cirkeldiagrammet. 
						if (!chart.getDataVisibility(index))
							return;

						const dataValue = dataset.data[index];
						if (typeof dataValue !== 'number')
							return;

						const draw = dataValue / total * 100 > 5;
						if (!draw)
							return;

						const x_coordinate = arc.x + mid_radius * Math.cos(mid_angle);
						const y_coordinate = arc.y + mid_radius * Math.sin(mid_angle);

						// Text stoerrelsen har ogsaa en betyding for placeringen.
						// Vi tilfoejer derfor noget margin paa y-koordinateen 
						ctx.fillText(dataValue.toLocaleString("da-DK"), x_coordinate, y_coordinate + 11 * 0.45);
					});
				});
			},
		}],
	});
}

function setAlpha(lchColor: string, alpha: number): string {
	const str = ' / ' + alpha;
	const nn = lchColor.replace(/ *\/ *[\d.]+/, '');
	const nn2 = nn.replace(/\)/, str + ')');
	return nn2;
}

function createBar(chartEle: HTMLCanvasElement, chartStyling: ChartStyling, data: DataSeries) {

	const cd = {
		labels: data.Labels,
		datasets: data.Datasets.map(ds => {
			return {
				label: ds.Label,
				data: ds.Data,
				backgroundColor: chartStyling.UseDatasetLabelColorsForBarChart
					? data.Labels.map(label => getColorForDataset(label))
					: getColorForDataset(ds),
				borderColor: chartStyling.UseDatasetLabelColorsForBarChart
					? data.Labels.map(label => getColorForDataset(label))
					: getColorForDataset(ds),
				borderWidth: chartStyling.BarStacked ? 0.5 : 0.25,
				animation: chartStyling.EnableAnimations ? undefined : false,
			};
		}),
	} satisfies ChartData;

	let delayed = false;
	new Chart(chartEle, {
		type: 'bar',
		data: cd,
		options: {
			indexAxis: chartStyling.BarOrientation,
			"layout": {
				"padding": {
					"left": 0,
					"top": 10,
					"bottom": 0,
				},
			},
			responsive: chartStyling.IsResponsive,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: chartStyling.DisplayLegend,
					position: 'bottom',
					align: 'start',
					labels: {
						boxWidth: 12,
						padding: 12,
						generateLabels(chart : Chart<'bar'>) {
							const uniqueLabels: {[label: string] : LegendItem} = {};
							chart.data.datasets.map((dataset, index) => {
								const label = dataset.label
								LectioJSUtils.AssertNotNullOrUndefined(label, 'label');
								const cpr = dataset.backgroundColor;
								if (!uniqueLabels[label]) {
									uniqueLabels[label] = {
										text: label,				
										fillStyle: dataset.backgroundColor as string ?? '',
										hidden: chart.data.datasets
											.filter(d => d.label === label)
											.every(d => d.hidden),
										strokeStyle: dataset.borderColor as string ?? '',
										lineWidth: 1,
										datasetIndex: index
									};
								}
							});
							const listOfLegendItems = Object.values(uniqueLabels);
							return listOfLegendItems;
						},
					},
					onClick: (event, item, element) => {
						const label = item.text
						const datasets = element.chart.data.datasets;
						datasets.forEach(r => {
							if (r.label == label)
								r.hidden = !r.hidden;
						})
						return;
					},
					onHover: (evt, item, legend) => {
						const chart = legend.chart;
						const datasets = legend.chart.data.datasets;
						const legendLabel = item.text;

						for (let dsidx = 0; dsidx < datasets.length; dsidx++) {
							const ds = datasets[dsidx];
							const isHovered = ds.label === legendLabel;
							const newcolor = setAlpha(ds.borderColor!.toString(), isHovered ? 1 : 0.2);
							ds.borderColor = newcolor;
							ds.backgroundColor = newcolor;
						}
						chart.canvas.style.cursor = 'pointer';
						chart.update();
					},
					onLeave: (evt, item, legend) => {
						const chart = legend.chart;
						const datasets = legend.chart.data.datasets;
						for (let dsidx = 0; dsidx < datasets.length; dsidx++) {
							const ds = datasets[dsidx];
							const newcolor = setAlpha(ds.borderColor!.toString(), 1);
							ds.borderColor = newcolor;
							ds.backgroundColor = newcolor;
						}
						chart.canvas.style.cursor = 'default'
						chart.update();
					},
					
				},
				tooltip: {
					enabled: false,
				external: context => {
						externalTooltipHandler(context, data, chartStyling);
					},
				},
				annotation: getAnnotation(chartStyling),
			},
			scales: {
				x: {
					title: { text: chartStyling.XAxisLabel, display: true },
					stacked: chartStyling.BarStacked,
					ticks: { padding: chartStyling.UseDatasetLabelColorsForBarChart ? 10 : 0 },
					grid: { display: chartStyling.DisplayXGridLines, },
					display: chartStyling.DisplayXAxis,
					border: { display: chartStyling.DisplayXBorder },
				},
				y: {
					title: { text: chartStyling.YAxisLabel, display: true },
					min: data.ValueAxisRangeFixed?.[0],
					max: data.ValueAxisRangeFixed?.[1],
					ticks: {
						stepSize: data.ValueAxisStepSize,
					},
					stacked: chartStyling.BarStacked,
					grid: { display: chartStyling.DisplayYGridLines },
					display: chartStyling.DisplayYAxis,
					border: { display: chartStyling.DisplayYBorder },
				},
			},
			animation: {
				duration: 50, // having 10 makes the canvas shrink when hovering over the bars.
				easing: 'easeOutSine',
				onComplete: () => {
					delayed = true;
				},
				delay: context => {
					let delay = 0;
					if (context.type === 'data' && context.mode === 'default' && !delayed) {
						delay = context.dataIndex * 30 + context.datasetIndex * 10;
					}
					return delay;
				},
			},
			datasets: {
				bar: {
					maxBarThickness: chartStyling.MaxBarThickness ?? 100, // null = ingen bar overhovedet
					barPercentage: chartStyling.BarPercentage,
					categoryPercentage: chartStyling.CategoryPercentage
				}
			},
		},

		plugins: [
			{
				id: 'ShowValueAboveBarPlugin',
				afterDatasetDraw: chart => {

					if (!chartStyling.ShowChartElementValue || chartStyling.BarStacked)
						return;

					const ctx = chart.ctx;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';
					// Colour code: Charcoal
					ctx.fillStyle = 'oklch(32.109% 0 none)';
					ctx.font = 'normal 0.9em Roboto';


					chart.data.datasets.forEach((dataset, i) => {
						const meta = chart.getDatasetMeta(i);
						if (meta.hidden || dataset.hidden)
							return;

						meta.data.forEach((bar, index) => {
							const dataValue = dataset.data[index];
							if (typeof dataValue !== 'number')
								return;

							const draw = dataValue > 0;
							if (!draw)
								return;

							ctx.fillText(dataValue.toLocaleString("da-DK"), bar.x, bar.y - 10);
						});
					});

					ctx.restore();
				},
			},
			{
				id: "showDatasetLabelUnderBar",
				afterDatasetDraw: chart => {

					if (!chartStyling.ShowLabelUnderBarChartElement)
						return;

					const ctx = chart.ctx;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';
					ctx.fillStyle = '#666';
					// "10.8px Roboto"
					ctx.font = ctx.font.replace(/\b([0-9.]+)([a-z]{2,3})\b/, () => '0.75em');

					chart.data.datasets.forEach((dataset, i) => {
						const meta = chart.getDatasetMeta(i);
						if (meta.hidden)
							return;
						const label = dataset.label;
						if (typeof label !== 'string')
							return;

						meta.data.forEach((bar, index) => {
							const dataValue = dataset.data[index];
							if (typeof dataValue !== 'number')
								return;

							//const draw = dataValue > 0;
							//if (!draw)
							//	return;

							ctx.fillText(label, bar.x, chart.scales.y.bottom + 15);
						});
					});

					ctx.restore();
				},
			},
		],
	});
}

function createLine(chartEle: HTMLCanvasElement, chartStyling: ChartStyling, data: DataSeries) {
	const cd = {
		labels: data.Labels,
		datasets: data.Datasets.map(ds => {
			return {
				label: ds.Label, data: ds.Data,
				borderColor: getColorForDataset(ds),
				backgroundColor: getColorForDataset(ds),
				animation: chartStyling.EnableAnimations ? undefined : false,
				type: 'line',
			};
		})
	} satisfies ChartData;

	new Chart(chartEle, {
		type: 'line',
		data: cd,
		options: {
			elements: {
				point: {
					pointStyle: chartStyling.LinePointStyling ?? false,
					radius: 3,
					hoverRadius: 5,
				},
			},
			responsive: chartStyling.IsResponsive,
			plugins: {
				annotation: getAnnotation(chartStyling),
				HighligthedIndices: {
					startIndex: null,
					endIndex: null
				},
				legend: {
					display: chartStyling.DisplayLegend,
					position: 'bottom',
					align: 'start',
					labels: {
						boxWidth: 12,
						padding: 12,
						generateLabels(chart: Chart<'bar'>) {
							const uniqueLabels: { [label: string]: LegendItem } = {};
							chart.data.datasets.map((dataset, index) => {
								const label = dataset.label
								LectioJSUtils.AssertNotNullOrUndefined(label, 'label');
								const cpr = dataset.backgroundColor;
								if (!uniqueLabels[label]) {
									uniqueLabels[label] = {
										text: label,
										fillStyle: dataset.backgroundColor as string ?? '',
										hidden: chart.data.datasets
											.filter(d => d.label === label)
											.every(d => d.hidden),
										strokeStyle: dataset.borderColor as string ?? '',
										lineWidth: 1,
										datasetIndex: index
									};
								}
							});
							const listOfLegendItems = Object.values(uniqueLabels);
							return listOfLegendItems;
						},
					},
					onClick: (event, item, element) => {
						const label = item.text
						const datasets = element.chart.data.datasets;
						datasets.forEach(r => {
							if (r.label == label)
								r.hidden = !r.hidden;
						})
						return;
					},
					onHover: (evt, item, legend) => {
						// Juster alpha for at fremhaeve det dataset som musen er over.
						const chart = legend.chart;
						const datasets = legend.chart.data.datasets;
						const legendLabel = item.text;
						for (let dsidx = 0; dsidx < datasets.length; dsidx++) {
							const ds = datasets[dsidx];
							const isHovered = ds.label === legendLabel;
							const newcolor = setAlpha(ds.borderColor!.toString(), isHovered ? 1 : 0.2);
							ds.borderColor = newcolor;
							ds.backgroundColor = newcolor;

							if (isHovered)
								ds.borderWidth = 4;
						}
						chart.canvas.style.cursor = 'pointer'
						chart.update();
					},

					onLeave: (evt, item, legend) => {
						// Fjern alpha brugt til at fremhaeve.
						const chart = legend.chart;
						const datasets = legend.chart.data.datasets;
						for (let dsidx = 0; dsidx < datasets.length; dsidx++) {
							const ds = datasets[dsidx];
							const newcolor = setAlpha(ds.borderColor!.toString(), 1);
							ds.borderColor = newcolor;
							ds.backgroundColor = newcolor;
							ds.borderWidth = undefined;
						}
						chart.canvas.style.cursor = 'default'
						chart.update();
					}
				},
				tooltip: {
					enabled: false,
					external: context => {
						externalTooltipHandler(context, data, chartStyling);
					},
				},
			},
			scales: {
				x: {
					title: { text: chartStyling.XAxisLabel, display: true },
					display: chartStyling.DisplayXAxis,
				},
				y: {
					title: { text: chartStyling.YAxisLabel, display: true },
					min: data.ValueAxisRangeFixed?.[0],
					max: data.ValueAxisRangeFixed?.[1],
					ticks: {
						stepSize: data.ValueAxisStepSize,
					},
				},
			},
			animations: {
				radius: {
					duration: 200,
					easing: 'easeOutSine',
				},
			},
			// hoverRadius: {},
			// hoverBackgroundColor: 'yellow',
			interaction: {
				mode: 'nearest',
				intersect: false,
				axis: 'x',
			},
		},
	});
}



