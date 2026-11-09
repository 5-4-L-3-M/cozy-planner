// Writing dock buttons, in the order you set (new buttons get added to the end).
export const DOCK_BUTTONS = [['undo', 'Undo'], ['redo', 'Redo'], ['eraser', 'Eraser'], ['left', '← Jump back'], ['line', '↵ Next line'], ['right', '→ Move right'], ['zoom', 'Zoom %']];
export function dockOrder(order) {
  const ids = DOCK_BUTTONS.map((b) => b[0]);
  const saved = (order || []).filter((id) => ids.includes(id));
  return [...saved, ...ids.filter((id) => !saved.includes(id))];
}
