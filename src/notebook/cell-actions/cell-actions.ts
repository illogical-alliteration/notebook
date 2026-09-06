import { JavascriptCellElement } from "../javascript-cell/javascript-cell";
import { MarkdownCellElement } from "../markdown-cell/markdown-cell";
import { TypescriptCellElement } from "../typescript-cell/typescript-cell";

type Runnable = JavascriptCellElement | TypescriptCellElement;
type Renderable = MarkdownCellElement;
type CellElement = Runnable | Renderable;

export class CellActionsElement extends HTMLElement {
  //#region public properties
  qs!: (query: string) => HTMLElement;
  qsa!: (query: string) => NodeList;
  //#endregion

  constructor(){
    super();
    this.attachShadow({mode: "open"});
    this.qs = this.shadowRoot!.querySelector.bind(this.shadowRoot);
    this.qsa = this.shadowRoot!.querySelector.bind(this.shadowRoot);
    this.setupUI(); 
  }

  async setupUI(){
    await this.fetchStyle();
    await this.fetchTemplate();
    this.setupCellActions();
  }

  async fetchStyle(): Promise<void> {
    const sheet = new CSSStyleSheet();
    const file = await fetch(new URL(`./cell-actions.css`, import.meta.url));
    const css = await file.text();
    sheet.replaceSync(css);
    this.shadowRoot!.adoptedStyleSheets = [sheet];
  }

  async fetchTemplate(): Promise<void> {
    const file = await fetch(new URL(`./cell-actions.html`, import.meta.url));
    const html = await file.text();
    this.shadowRoot!.innerHTML = html;
  }

  //#region private methods
  private setupCellActions(): void {
    this.qs('.delete-cell')!.addEventListener('click', () => this.onDeleteCellClick());
    this.qs('.prepend-cell')!.addEventListener('click', () => this.onPrependCellClick());
    this.qs('.append-cell')!.addEventListener('click', () => this.onAppendCellClick());
    this.qs('.run-cell').addEventListener('click', () => this.onRunClick());
      
    const cell = this.getParent();
    if(cell instanceof JavascriptCellElement || cell instanceof TypescriptCellElement){
      this.qs('.run-cell').innerText = 'Run';
      this.qs('.reset-cell').addEventListener('click', () => this.onResetCellClick());
    }else{
      this.qs('.run-cell').innerText = 'Render';
      this.qs('.reset-cell').parentElement?.remove();
    }

  }

  private getParent(): MarkdownCellElement | JavascriptCellElement | TypescriptCellElement {
    const md = (this.getRootNode() as any).host.closest('markdown-cell');
    const ts = (this.getRootNode() as any).host.closest('typescript-cell');
    const js = (this.getRootNode() as any).host.closest('javascript-cell');
    return md ?? ts ?? js;
  }

  private onDeleteCellClick(): void {
    this.getParent().remove();
  }

  private onResetCellClick(): void {
    (this.getParent() as Runnable).resetOutput();
  }

  private onPrependCellClick(): void {
    const CellType = this.getParent().constructor as 
      typeof MarkdownCellElement | 
      typeof JavascriptCellElement | 
      typeof TypescriptCellElement;
    
    const cell = new CellType();
    cell.ready.then(() => {
      this.getParent().before(cell);
      cell.view.focus();
    });
  }

  private onAppendCellClick(): void {
    const CellType = this.getParent().constructor as 
      typeof MarkdownCellElement | 
      typeof JavascriptCellElement | 
      typeof TypescriptCellElement;
    
    const cell = new CellType();
    cell.ready.then(() => {
      this.getParent().after(cell);
      cell.view.focus();
    });
  }

  isRunnable(cell: CellElement): boolean {
    return cell instanceof JavascriptCellElement || cell instanceof TypescriptCellElement;
  }

  isRenderable(cell: CellElement): boolean {
    return cell instanceof MarkdownCellElement;
  }

  private onRunClick(): void {
    const parentCell = this.getParent();

    if(this.isRunnable(parentCell)){
      (parentCell as Runnable).run();      
    }

    if(this.isRenderable(parentCell)){
      (parentCell as Renderable).render();
    }
  }
  //#endregion
}
