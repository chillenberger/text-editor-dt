import { Node, mergeAttributes } from '@tiptap/core'

const blockTags = [
	"address",
	"article",
	"aside",
	"blockquote",
	"canvas",
	"dd",
	"div",
	"dl",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hr",
	"li",
	"main",
	"nav",
	"noscript",
	"ol",
	"output",
	"p",
	"pre",
	"section",
	"table",
	"tfoot",
	"ul",
	"video",
	"caption",
	"col",
	"colgroup",
	"tbody",
	"td",
	"th",
	"thead",
	"tr",
	"br"
];

const inlineTags = [
	"a",
	"abbr",
	"acronym",
	"audio",
	"b",
	"bdi",
	"bdo",
	"big",
	"cite",
	"code",
	"data",
	"datalist",
	"del",
	"dfn",
	"em",
	"i",
	"ins",
	"kbd",
	"map",
	"mark",
	"picture",
	"q",
	"ruby",
	"s",
	"samp",
	"script",
	"slot",
	"small",
	"span",
	"strong",
	"sub",
	"sup",
	"svg",
	"template",
	"time",
	"tt",
	"u",
	"var",
	"wbr",
	"iframe",
	"source",
	"track"
];

const inlineBlockTags = [
	"input",
	"textarea",
	"button",
	"select",
	"label",
	"progress",
	"meter",
	"embed",
	"object"
];

const attributes = [
	"style",
	"align",
	"width",
	"height",
	"border",
	"cellspacing",
	"alt",
	"src",
	"srcset",
	"href",
	"rel",
	"target",
  "class"
];

const CustomElement = Node.create({
	name: "attributesPreserver",
	defining: true,

	addOptions() {
    console.log("CustomElement addOptions called");
		const options = { tagname: null };
		attributes.forEach(attribute => {
			options[attribute] = null;
		});
		return options;
	},

	group() {
    console.log("CustomElement group called");
		const { tagname } = this.options;
		try {
			if (blockTags.includes(tagname)) return "block";
			if (inlineTags.includes(tagname)) return "inline";
			if (inlineBlockTags.includes(tagname)) return "inline";
		} catch (error) {
			console.warn(`Unknown tag encountered: ${tagname}`);
		}
		return "block";
	},

	content() {
    console.log("CustomElement content called");
		const { tagname } = this.options;
		try {
			if (inlineTags.includes(tagname)) return "inline*";
			if (blockTags.includes(tagname)) return "block*";
			if (inlineBlockTags.includes(tagname)) return "inline*";
		} catch (error) {
			console.warn(`Unknown tag encountered: ${tagname}`);
		}
		return "block*"; // Default to block content
	},

	addAttributes() {
    console.log("CustomElement addAttributes called");
		const attributesSet = { tagname: { default: null } };
		attributes.forEach(attribute => {
			attributesSet[attribute] = { default: null };
		});
    console.log("Attributes set in addAttributes:", attributesSet);
		return attributesSet;
	},

	parseHTML() {
    console.log("CustomElement parseHTML called");
		return [
			...blockTags.map(tag => ({
				tag,
				priority: 1000,
				getAttrs: dom => {
					const attributesSet = {
						tagname: dom.nodeName.toLowerCase() || this.options.tagname
					};
					attributes.forEach(attribute => {
						attributesSet[attribute] =
							dom.getAttribute(attribute) || this.options[attribute];
					});
					return attributesSet;
				}
			})),
			...inlineTags.map(tag => ({
				tag,
				priority: 1000,
				getAttrs: dom => {
					const attributesSet = {
						tagname: dom.nodeName.toLowerCase() || this.options.tagname
					};
					attributes.forEach(attribute => {
						attributesSet[attribute] =
							dom.getAttribute(attribute) || this.options[attribute];
					});
					return attributesSet;
				}
			})),
			...inlineBlockTags.map(tag => ({
				tag,
				priority: 1000,
				getAttrs: dom => {
					const attributesSet = {
						tagname: dom.nodeName.toLowerCase() || this.options.tagname
					};
					attributes.forEach(attribute => {
						attributesSet[attribute] =
							dom.getAttribute(attribute) || this.options[attribute];
					});
					return attributesSet;
				}
			}))
		];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			node.attrs.tagname || 'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	}
});

export default CustomElement;
