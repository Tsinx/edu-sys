import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect,
  useMemo, useRef, useState, type PropsWithChildren, type ReactNode
} from 'react';
import { Ellipsis, SlidersHorizontal, X } from 'lucide-react';
import { pageToolsAllowed, type PageToolsRole } from './page-tools-policy';
export { pageToolsAllowed, type PageToolsRole } from './page-tools-policy';

export interface PageToolAction {
  id: string;
  label: string;
  ariaLabel?: string;
  title?: string;
  icon?: ReactNode;
  area?: 'page' | 'utility';
  priority?: 'primary' | 'secondary';
  disabled?: boolean;
  pressed?: boolean;
  panelId?: string;
  onInvoke?: () => void;
}
export interface PageToolPanel {
  id: string;
  title: string;
  content: ReactNode;
}
export interface PageToolsDefinition {
  pageKey: string;
  actions: readonly PageToolAction[];
  panels?: readonly PageToolPanel[];
  status?: { text: string; error?: boolean };
  /** 'local' permits only explicitly supplied local controls on a student device. */
  audience?: 'teacher' | 'local';
}
interface PageToolsRegistration {
  pageKey: string;
  role: PageToolsRole;
  classroomSpeech: boolean;
  update: (owner: string, definition: PageToolsDefinition | null) => void;
  remove: (owner: string) => void;
  closePanel: () => void;
}
interface PageToolsState {
  definitions: ReadonlyMap<string, PageToolsDefinition>;
  selected: string | null;
  select: (key: string | null) => void;
}
const RegistrationContext = createContext<PageToolsRegistration | null>(null);
const StateContext = createContext<PageToolsState | null>(null);

/** Controllers stay mounted; only their declarative control definitions change. */
export function PageToolsProvider({ pageKey, role = 'teacher', classroomSpeech = false, children }:
  PropsWithChildren<{ pageKey: string; role?: PageToolsRole; classroomSpeech?: boolean }>) {
  const [definitions, setDefinitions] = useState<ReadonlyMap<string, PageToolsDefinition>>(new Map());
  const [selected, select] = useState<string | null>(null);
  const closePanel = useCallback(() => select(null), []);
  const update = useCallback((owner: string, definition: PageToolsDefinition | null) => {
    setDefinitions(previous => {
      if (previous.get(owner) === definition || (!definition && !previous.has(owner))) return previous;
      const next = new Map(previous);
      if (definition) next.set(owner, definition); else next.delete(owner);
      return next;
    });
  }, []);
  const remove = useCallback((owner: string) => update(owner, null), [update]);
  useEffect(closePanel, [pageKey, role, closePanel]);
  const registration = useMemo(() => ({ pageKey, role, classroomSpeech, update, remove, closePanel }),
    [pageKey, role, classroomSpeech, update, remove, closePanel]);
  const state = useMemo(() => ({ definitions, selected, select }), [definitions, selected]);
  return <RegistrationContext.Provider value={registration}><StateContext.Provider value={state}>
    {children}
  </StateContext.Provider></RegistrationContext.Provider>;
}

export const usePageToolsScope = () => useContext(RegistrationContext);

/** Registration and display use separate contexts to avoid a render/update loop. */
export function usePageTools(definition: PageToolsDefinition | null) {
  const host = usePageToolsScope(), owner = useId();
  useLayoutEffect(() => { host?.update(owner, definition); }, [host, owner, definition]);
  useLayoutEffect(() => () => host?.remove(owner), [host, owner]);
  return host;
}

/** Adapter for an existing control group; its controller remains in the course component. */
export function PageToolsContribution({ pageKey, title, children, actions = [], status, audience, priority = 'primary' }:
  PropsWithChildren<{ pageKey: string; title: string; actions?: readonly PageToolAction[];
    status?: PageToolsDefinition['status']; audience?: PageToolsDefinition['audience']; priority?: PageToolAction['priority'] }>) {
  const host = usePageTools({ pageKey, audience, status, actions: [...actions,
    { id: 'tools', label: title, icon: <SlidersHorizontal size={18}/>, panelId: 'tools', priority }],
    panels: [{ id: 'tools', title, content: children }] });
  return host ? null : <>{children}</>;
}

interface ToolbarProps {
  navigation?: ReactNode;
  utilities?: ReactNode;
  more?: ReactNode;
  end?: ReactNode;
  label?: string;
  moreLabel?: string;
  className?: string;
}
/** One stable toolbar for ordinary/fullscreen layouts and independent course viewers. */
export function PresentationToolbar({ navigation, utilities, more, end, label = '课堂工具栏',
  moreLabel = '更多工具', className = '' }: ToolbarProps) {
  const host = usePageToolsScope(), state = useContext(StateContext);
  const root = useRef<HTMLElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null), panelId = useId();
  const definitions = state && host ? [...state.definitions].filter(([, definition]) =>
    pageToolsAllowed(definition, host.pageKey, host.role)) : [];
  const actions = definitions.flatMap(([owner, definition]) => definition.actions.map(action => ({ owner, definition, action })));
  const primary = actions.filter(({ action }) => action.priority !== 'secondary');
  const secondary = actions.filter(({ action }) => action.priority === 'secondary');
  const statuses = definitions.flatMap(([, definition]) => definition.status?.text ? [definition.status] : []);
  const selectedPanel = definitions.flatMap(([owner, definition]) => (definition.panels ?? [])
    .map(panel => ({ key: `${owner}/${panel.id}`, panel }))).find(item => item.key === state?.selected);
  const moreOpen = state?.selected === '@more', open = Boolean(selectedPanel || moreOpen);
  const close = useCallback((restoreFocus = false) => {
    host?.closePanel();
    if (restoreFocus) {
      const button = trigger.current?.isConnected ? trigger.current
        : root.current?.querySelector<HTMLButtonElement>('.presentation-toolbar__more');
      button?.focus();
    }
  }, [host]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, close]);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('.presentation-tool-panel__body textarea,.presentation-tool-panel__body input:not(:disabled),.presentation-tool-panel__body select:not(:disabled),.presentation-tool-panel__body button:not(:disabled)')?.focus();
  }, [open, state?.selected]);
  const renderAction = ({ owner, action }: typeof actions[number], inMore = false) => {
    const expanded = Boolean(action.panelId && state?.selected === `${owner}/${action.panelId}`);
    return <button type="button" key={`${owner}/${action.id}`}
      className={`presentation-tool${action.area === 'utility' ? ' presentation-tool--utility' : ''}${inMore ? ' presentation-tool--menu' : ''}`}
      aria-label={action.ariaLabel ?? action.label} title={action.title ?? action.label}
      disabled={action.disabled} aria-pressed={action.pressed}
      aria-expanded={action.panelId ? expanded : undefined} aria-controls={action.panelId ? panelId : undefined}
      onClick={event => {
        trigger.current = event.currentTarget;
        if (action.panelId) state?.select(expanded ? null : `${owner}/${action.panelId}`);
        else { close(); action.onInvoke?.(); }
      }}>{action.icon}<span>{action.label}</span></button>;
  };
  return <footer ref={root} className={`presentation-toolbar ${className}`} aria-label={label}
    onKeyDownCapture={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); }
    }}>
    {navigation && <div className="presentation-toolbar__navigation">{navigation}</div>}
    <div className="presentation-toolbar__actions">
      {primary.filter(({ action }) => action.area !== 'utility').map(item => renderAction(item))}
      {primary.filter(({ action }) => action.area === 'utility').map(item => renderAction(item))}
      {statuses.length > 0 && <span className={`presentation-toolbar__status${statuses.some(status => status.error) ? ' presentation-toolbar__status--error' : ''}`}
        role="status" title={statuses.map(status => status.text).join(' · ')}>{statuses.map(status => status.text).join(' · ')}</span>}
      {utilities}
    </div>
    {(more || secondary.length > 0) && <button type="button" className="presentation-toolbar__more" aria-label={moreLabel}
      title={moreLabel} aria-expanded={moreOpen} aria-controls={panelId} onClick={event => {
        trigger.current = event.currentTarget; state?.select(moreOpen ? null : '@more');
      }}><Ellipsis size={20}/></button>}
    {end && <div className="presentation-toolbar__end">{end}</div>}
    {open && <div ref={panelRef} className="presentation-tool-panel" id={panelId} role="dialog"
      aria-label={selectedPanel?.panel.title ?? moreLabel}>
      <div className="presentation-tool-panel__head"><strong>{selectedPanel?.panel.title ?? moreLabel}</strong>
        <button type="button" aria-label="关闭工具面板" onClick={() => close(true)}><X size={18}/></button></div>
      <div className="presentation-tool-panel__body">{selectedPanel ? selectedPanel.panel.content : <>
        {secondary.map(item => renderAction(item, true))}{more}
      </>}</div>
    </div>}
  </footer>;
}
