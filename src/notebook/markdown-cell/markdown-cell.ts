import { basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap, placeholder, EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { indentWithTab } from '@codemirror/commands';
import { marked } from 'marked';
import katex from 'katex';

let tabSize = new Compartment();

export class MarkdownCellElement extends HTMLElement {
  view!: EditorView;
  qs!: (query: string) => HTMLElement;
  qsa!: (query: string) => NodeListOf<Element>;
  ready: Promise<boolean>;
  isRendered: boolean = false;
  
  set source(val: string) {
    if (this.view) {
      this.view.dispatch({
        changes: { 
          from: 0, 
          to: this.view.state.doc.length, 
          insert: val 
        }
      });
    }
  }

  get source(): string {
    return this.view ? this.view.state.doc.toString() : '';
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    
    this.qs = this.shadowRoot!.querySelector.bind(this.shadowRoot);
    this.qsa = this.shadowRoot!.querySelectorAll.bind(this.shadowRoot);

    this.ready = new Promise(async (resolve) => {
      await this.setupUI();
      resolve(true);
    });
  }

  async setupUI() {
    await this.fetchStyle();
    await this.fetchTemplate();
    this.setupCodeMirror();
    this.setupEvents();
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

  private setupEvents(): void {
    const output = this.qs('.cell-output');
    const renderBtn = this.qs('.render-btn') || this.qs('#render') || this.qs('button');

    // Toggle render when clicking the "Render" button below the cell
    renderBtn?.addEventListener('click', () => this.toggleRender());

    // Double-click output container to go back to editor mode
    output?.addEventListener('dblclick', () => {
      if (this.isRendered) {
        this.toggleRender(false);
      }
    });
  }

  /**
   * Toggles between raw Markdown editor and rendered HTML/KaTeX output
   */
  public toggleRender(forceState?: boolean): void {
    this.isRendered = forceState !== undefined ? forceState : !this.isRendered;

    const input = this.qs('.cell-editor');
    const output = this.qs('.cell-output');

    if (this.isRendered) {
      // 1. Convert Markdown to HTML
      const html = marked.parse(this.source) as string;
      output.innerHTML = html;

      // 2. Parse KaTeX Math ($$ block $$ and $ inline $)
      output.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent?.includes("$$")) {
          el.innerHTML = el.innerHTML.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
            try {
              return katex.renderToString(math.trim(), { displayMode: true });
            } catch (e) {
              return `<span class="katex-error">${math}</span>`;
            }
          });
        }

        if (el.children.length === 0 && el.textContent?.includes("$")) {
          el.innerHTML = el.innerHTML.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
            try {
              return katex.renderToString(math.trim(), { displayMode: false });
            } catch (e) {
              return `<span class="katex-error">${math}</span>`;
            }
          });
        }
      });

      // 3. Swap UI visibility
      input.style.display = 'none';
      output.style.display = 'block';
    } else {
      // Return to Editor
      output.style.display = 'none';
      input.style.display = 'block';
      this.view.focus();
    }
  }

  // Public method mapped to render button
  render(): void {
    this.toggleRender();
  }

  toJSON(): any {
    return {
      "cell_type": "markdown",
      "metadata": {},
      "source": this.source
    };
  }

  static fromJSON(obj: any): MarkdownCellElement {
    const cell = new MarkdownCellElement();
    cell.fromJSON(obj);
    return cell;
  }

  fromJSON(obj: {source: string | string[]}): void {
    this.ready.then(() => {
      if (typeof obj.source === 'string') {
        this.source = obj.source;
      }
      if (Array.isArray(obj.source)) {
        this.source = obj.source.join('');
      }

      this.render(true);
    });
  }

  static fromString(str: string): MarkdownCellElement {
    const obj = JSON.parse(str);
    return MarkdownCellElement.fromJSON(obj);
  }

  fromString(str: string): void {
    const obj = JSON.parse(str);
    this.fromJSON(obj);
  }

  disconnectedCallback(): void { 
    this.view?.destroy();
  }

  private setupCodeMirror(): void {
    const cell = this;

    const CtrlEnter = keymap.of([{
      key: "Ctrl-Enter",
      run() {
        cell.toggleRender();
        return true;
      }
    }]);

    const extensions = [
      EditorView.contentAttributes.of({
        'aria-label': "Cell editor"
      }),
      CtrlEnter,
      basicSetup,
      keymap.of([ indentWithTab ]),
      tabSize.of( EditorState.tabSize.of( 2 ) ),
      EditorView.lineWrapping,
      placeholder("Write here..."),
      markdown()
    ];
    
    this.view = new EditorView({
      state: EditorState.create({ extensions }), 
      parent: this.qs('.cell-editor')
    });
  }
}