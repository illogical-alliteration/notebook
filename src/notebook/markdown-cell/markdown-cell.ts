import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { marked } from 'marked';
let language = new Compartment, tabSize = new Compartment;


export class MarkdownCellElement extends HTMLElement {
  //#region public properties
  view!: EditorView;
  qs!: (query: string) => HTMLElement;
  qsa!: (query: string) => NodeList;
  ready: Promise<boolean>;
  
  set source(val: string){
    this.view?.dispatch({
      changes: { 
        from: 0, 
        to: this.view.state.doc.length, 
        insert: val 
      }
    });
  }

  get source(): string {
    return this.view.state.doc.toString();
  }
  //#endregion

  constructor(){
    // Call parent constructor
    super();
    
    // attach shadowRoot
    this.attachShadow({mode: "open"});
    
    // setup querySelector and querySelectorAll shorthands
    this.qs = this.shadowRoot!.querySelector.bind(this.shadowRoot);
    this.qsa = this.shadowRoot!.querySelector.bind(this.shadowRoot);

    this.ready = new Promise(async (resolve, reject) => {
      await this.setupUI();
      resolve(true);
    })
  }

  async setupUI(){
    await this.fetchStyle();
    await this.fetchTemplate();
    this.setupCodeMirror();
  }

  async fetchStyle(): Promise<void> {
    const sheet = new CSSStyleSheet();
    const file = await fetch(new URL(`./markdown-cell.css`, import.meta.url));
    const css = await file.text();
    sheet.replaceSync(css);
    this.shadowRoot!.adoptedStyleSheets = [sheet];
  }

  async fetchTemplate(): Promise<void> {
    const file = await fetch(new URL(`./markdown-cell.html`, import.meta.url));
    const html = await file.text();
    this.shadowRoot!.innerHTML = html;
  }

  //#region public methods
  toJSON(): any {
    return {
      "cell_type": "markdown",
      "metadata": {},
      "source": this.source
    };
  }

  static fromJSON(obj: any): MarkdownCellElement {
    const cell = new MarkdownCellElement();
    cell.fromJSON(obj)
    return cell;
  }

  fromJSON(obj: {source: string | string[]}): void {
    this.ready.then(() => {
      if(typeof obj.source === 'string'){
        this.source = obj.source;
      }
      if(Array.isArray(obj.source)){
        this.source = obj.source.join('')
      }
    })
  }

  static fromString(str: string): MarkdownCellElement {
    const obj = JSON.parse(str);
    const cell = MarkdownCellElement.fromJSON(obj);
    return cell;
  }

  fromString(str: string): void {
    const obj = JSON.parse(str);
    this.fromJSON(obj);
  }

  disconnectedCallback(): void { 
    this.view.destroy();
  }

  async render(){
    const source = this.source;
    console.log(source)
    const html = await marked.parse( this.source );

    const input = this.qs('.cell-editor');
    const output = this.qs('.cell-output');

    const previous = input.style.display;
    input.style.display = 'none';
    output.innerHTML = html;

    output.addEventListener('dblclick', () => {
      output.innerHTML = '';
      this.source = source;
      input.style.display = previous;
    });
  }
  //#endregion

  //#region private methods
  private setupCodeMirror(): void {
    const cell = this;

    function CtrlEnter(){
      return keymap.of([{
        key: "Ctrl-Enter",
        run(){
          cell.render();
          return true;
        }
      }]);
    }

    const extensions = [
      EditorView.contentAttributes.of({
        'aria-label': "Cell editor"
      }),
      CtrlEnter(),
      basicSetup,
      keymap.of([ indentWithTab ]),
      language.of( markdown() ),
      tabSize.of( EditorState.tabSize.of( 2 ) ),
      EditorView.lineWrapping,
      placeholder("Write here ...")
    ];

    const state = EditorState.create( { extensions } );
    
    this.view = new EditorView({
      state, 
      parent: this.qs('.cell-editor')
    });
  }
  //#endregion
}