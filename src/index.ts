import { CellTypeSelector } from "./notebook/cell-type-selector/cell-type-selector.ts";
import { MarkdownCellElement } from "./notebook/markdown-cell/markdown-cell.ts";
import { NotebookElement } from "./notebook/notebook/notebook.ts";
import { CellActionsElement } from "./notebook/cell-actions/cell-actions.ts";
import { JavascriptCellElement } from "./notebook/javascript-cell/javascript-cell.ts";
import { TypescriptCellElement } from "./notebook/typescript-cell/typescript-cell.ts";
import { NotebookActionsElement } from "./notebook/notebook-actions/notebook-actions.ts";
import { NotebookAppElement } from "./notebook/notebook-app/notebook-app.ts";

window.customElements.define("markdown-cell", MarkdownCellElement);
window.customElements.define("notebook-el", NotebookElement);
window.customElements.define("cell-type", CellTypeSelector)
window.customElements.define("cell-actions", CellActionsElement);
window.customElements.define("javascript-cell", JavascriptCellElement);
window.customElements.define('typescript-cell', TypescriptCellElement);
window.customElements.define('notebook-actions', NotebookActionsElement);
window.customElements.define('notebook-app', NotebookAppElement);

if("serviceWorker" in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker
    .register(new URL('./sw.ts', import.meta.url), {
      scope: "/notebook/",
      type: "module"
    })
    .then((registration: ServiceWorkerRegistration) => {
      console.log("ServiceWorker registration successful with scope: ", registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if(newWorker){
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              console.log("New content available! Please refresh.")
            }
          })
        }
      })
    })
    .catch(error => {
      console.error(`Service Worker registration failed: ${error}`);
    });

    navigator.serviceWorker.ready
    .then(registration => {
      navigator.storage.persist();
    })
    .catch(error => {
      console.error(`Service Worker failed to become ready: ${error}`);
    });
  });
}