const actionHandlers={
  'toggle-calendar':event=>toggleCalendar(event),
  'calendar-prev':()=>navPrev(),
  'calendar-today':()=>goToday(),
  'toggle-calendar-pin':event=>toggleCalendarPin(event),
  'calendar-next':()=>navNext(),
  'link-file':()=>linkFile(),
  'restore-calendar-from-cloud':()=>restoreCalendarFromCloud(),
  'export-file':()=>exportFile(),
  'import-file':()=>importFile(),
  'mount-startup-file':()=>mountStartupFile(),
  'choose-and-mount-file':()=>chooseAndMountFile(),
  'resolve-mount-conflict':(_event,el)=>resolveMountConflict(el.dataset.source),
  'load-merge-from':(_event,el)=>loadMergeFrom(el.dataset.source),
  'confirm-merged-conflict':()=>confirmMergedConflict(),
  undo:()=>doUndo(),
  redo:()=>doRedo(),
  'exec-command':(_event,el)=>execCmd(el.dataset.command),
  'set-block-format':(_event,el)=>setBlockFormat(el.dataset.format),
  'toggle-fold-selection':()=>toggleFoldSelection(),
  'show-table-dialog':()=>showTableDlg(),
  'pick-image':()=>pickImg(),
  'open-canvas':()=>openCanvasEditor(),
  'apply-highlight':()=>applyHighlight(),
  'toggle-highlight-picker':()=>toggleHlPicker(),
  'apply-text-color':()=>applyTextColor(),
  'toggle-text-color-picker':()=>toggleTextColorPicker(),
  'toggle-dark':()=>toggleDark(),
  'present-selection':()=>presentSelection(),
  'image-align':(_event,el)=>imgAlign(el.dataset.value),
  'image-size':(_event,el)=>imgSize(el.dataset.value),
  'image-delete':()=>imgDelete(),
  'edit-canvas':()=>openCanvasEditor(selImg),
  'table-add-row':(_event,el)=>tblAddRow(el.dataset.value),
  'table-add-col':(_event,el)=>tblAddCol(el.dataset.value),
  'table-delete-row':()=>tblDelRow(),
  'table-delete-col':()=>tblDelCol(),
  'table-move-row':(_event,el)=>tblMoveRow(el.dataset.value),
  'table-move-col':(_event,el)=>tblMoveCol(el.dataset.value),
  'table-delete':()=>tblDelTable(),
  'close-image-modal':(_event,el)=>el.classList.remove('show'),
  'close-presenter':()=>closePresenter(),
  'set-presenter-tool':(_event,el)=>setPresenterTool(el.dataset.mode),
  'hide-table-dialog':()=>hideTableDlg(),
  'insert-table':()=>insertTable(),
  'hide-tex-input':()=>hideTexInput(),
  'confirm-tex':()=>confirmTex(),
  'close-todo-editor':()=>closeTodoEditor(),
  'save-todo-editor':()=>saveTodoEditor()
};

const changeHandlers={
  'handle-image-input':event=>handleImg(event),
  'handle-import-input':event=>handleImport(event)
};

function bindDeclarativeEvents(root=document){
  root.addEventListener('click',event=>{
    const actionEl=event.target.closest&&event.target.closest('[data-action]');
    if(!actionEl||!root.contains(actionEl))return;
    const handler=actionHandlers[actionEl.dataset.action];
    if(!handler)return;
    handler(event,actionEl);
  },{capture:true});

  root.addEventListener('change',event=>{
    const action=event.target&&event.target.dataset&&event.target.dataset.changeAction;
    const handler=changeHandlers[action];
    if(handler)handler(event,event.target);
  });

  root.addEventListener('keydown',event=>{
    const action=event.target&&event.target.dataset&&event.target.dataset.enterAction;
    if(!action||event.key!=='Enter')return;
    const handler=actionHandlers[action];
    if(handler){
      event.preventDefault();
      handler(event,event.target);
    }
  });
}

bindDeclarativeEvents();
