import { useDaemonAvailability } from '../../daemon/availability-context.js';
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useActions,
  useChannels,
  useConnection,
  useWorkspace,
  useWorkspaceActions,
} from '@qwen-code/web-shell/daemon-react-sdk';
import {
  STANDALONE_SESSIONS_CAPABILITY,
  type DaemonSessionGroup,
  type DaemonSessionGroupColor,
  type DaemonSessionGroupHexColor,
  type DaemonSessionGroupPresetColor,
  type DaemonSessionSummary,
  type DaemonWorkspaceCapability,
  type SessionMetadataResult,
} from '@qwen-code/sdk/daemon';
import type { ManagedArchivedSessionsStatus } from '../managed/ManagedArchivedSessions';
import {
  HouseIcon,
  BellIcon,
  InboxIcon,
  BlocksIcon,
  BotIcon,
  TargetIcon,
  WorkflowIcon,
  EllipsisIcon,
  FolderKanbanIcon,
  ActivityIcon,
  CalendarClockIcon,
  GitPullRequestIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Columns2Icon,
  LayoutGridIcon,
  LoaderCircleIcon,
  ListTodoIcon,
  MessageCircleIcon,
  EllipsisVerticalIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  DownloadIcon,
  FolderClosedIcon,
  FolderInputIcon,
  GitBranchIcon,
  GitForkIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  AudioLinesIcon,
  MessagesSquareIcon,
  SearchIcon,
  SettingsIcon,
  SquarePenIcon,
  SunIcon,
} from 'lucide-react';
import { WebShellThemeId, type WebShellTheme } from '../../themeContext';
import { useBrand, useBrandName } from '../../brandContext';
import { useI18n } from '../../i18n';
import { MAX_SPLIT_PANES } from '../../utils/splitUrl';
import { McpAppGeneratedUiOwnerContext } from '../../mcpAppHostContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Empty, EmptyMedia, EmptyDescription } from '../ui/empty';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Field, FieldGroup, FieldLabel } from '../ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { formatDateTime } from '../../utils/formatDateTime';
import { DialogShell } from '../dialogs/DialogShell';
import { useWorkspaceRemoval } from '../workspaces/useWorkspaceRemoval';
import {
  OtherHostProjects,
  WorkspaceHostHeading,
} from '../workspaces/WorkspaceHostProjects';
import { useFanoutOrigins } from '../../config/host-fanout';
import { WorkspaceRemovalDialog } from '../workspaces/WorkspaceRemovalDialog';
import { WorkspaceSection, isAbsolutePath } from './WorkspaceSection';
import type { SessionTreeRenderOptions } from './sessionTree';
import { useSessionTree } from './useSessionTree';
import { WorkspaceMenu, type WorkspaceMenuActions } from './WorkspaceMenu';
import {
  moveWorkspace,
  orderWorkspaces,
  readWorkspaceOrder,
  writeWorkspaceOrder,
} from './workspaceOrder';
import { WorkspaceRenameDialog } from './WorkspaceRenameDialog';
import {
  DEFAULT_WORKSPACE_OVERVIEW_ITEMS,
  summarizeSessions,
  type WorkspaceManagementTarget,
  type WorkspaceOverviewItem,
} from './workspaceOverviewModel';
import { writeClipboardText } from '../../utils/clipboard';
import { isDesktopShell } from '../../utils/externalOpen';
import { isLocalDaemon, isPageOriginDaemon } from '../../config/daemon';
import {
  mergeSessionContentHits,
  sessionMatchesGitQuery,
  sessionMatchesSource as matchesSessionSource,
} from './sessionSearch';
import { useSessionContentSearch } from './useSessionContentSearch';
import { useLivePresence } from '../../live/live-presence';
import { SessionPrBadge, openableSessionPrs } from '../SessionPrBadge';
import {
  hasWorkspaceExpansionPreference,
  migrateWorkspaceExpansionPreference,
  readWorkspaceExpanded,
  writeWorkspaceExpanded,
} from './workspaceExpansion';
import { SessionGroupSection } from './SessionGroupSection';
import { SessionRenameEditor } from './SessionRenameEditor';
import { SessionDetailsTooltip } from './SessionDetailsTooltip';
import { groupSessionsByChannelType } from './channelSessionGroups';
import {
  isPrimaryCollapsedSectionId,
  readCollapsedSessionSectionIds,
  replaceOwnedCollapsedSessionSectionIds,
} from './collapsedSessionSections';
import { measureSessionTitleScroll } from './sessionTitleScroll';
import {
  collectScheduledTaskSession,
  getScheduledTaskSessionGroup,
  type ScheduledTaskSessionSection,
} from './scheduled-task-session-groups';
import {
  SESSION_LIST_PAGE_SIZE,
  SESSION_ORGANIZATION_FEATURE,
  SIDEBAR_SESSION_PREVIEW_LIMIT,
  WEB_SHELL_SESSION_SOURCE_TYPE,
} from '../../constants/sessions';
import styles from './WebShellSidebar.module.css';
import { UpdateControl } from './UpdateControl';
import {
  useSessionCatalogController,
  useSessionCatalogPolling,
  useSessionCatalogQueries,
  useWebShellSessions,
} from '../../session-catalog/session-catalog-hooks';
import { type SessionCatalogQuery } from '../../session-catalog/session-catalog-store';
import { useWorkspaceSessionLiveState } from '../../session-catalog/workspace-session-live-state';
import { StandaloneRecents } from './StandaloneRecents';
import { RecentSessions } from './RecentSessions';
import { LocalFilesControl } from '../LocalFilesControl';
import { DesktopRelayControl } from '../DesktopRelayControl';
import { workspaceLabelForCwd } from '../../utils/workspace';
import {
  ActivityView,
  useActivityOperations,
  readActivityPreferences,
  ACTIVITY_PREFERENCES_EVENT,
} from './ActivityView';
import {
  activityNeedsAttention,
  type ActivityEntry,
  isActivityEligible,
} from './activity-model';
import { activityKey, useActivityCatalog } from './use-activity-catalog';
import { SidebarSectionHeader } from './SidebarSectionHeader';
import { comparePinnedSectionSessions } from './pinned-session-order';

const SIDEBAR_WIDTH_STORAGE_KEY = 'qwen-code-web-shell-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 300;
export const SIDEBAR_RAIL_WIDTH = 56;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_MAX_WIDTH_WINDOW_RATIO = 0.5;
const SIDEBAR_FOOTER_COMPACT_WIDTH = 344;
const SIDEBAR_DRAG_VISUAL_MIN_WIDTH = 200;
const SIDEBAR_COLLAPSE_DRAG_THRESHOLD = 56;
const SIDEBAR_COLLAPSE_DRAG_WIDTH =
  SIDEBAR_DRAG_VISUAL_MIN_WIDTH - SIDEBAR_COLLAPSE_DRAG_THRESHOLD;
const ACTIVE_SESSION_POLL_INTERVAL_MS = 2000;
const IDLE_SESSION_POLL_INTERVAL_MS = 30_000;
const DIALOG_SESSION_LABEL_MAX_LENGTH = 96;
const RECENT_SESSION_SECTION_ID = 'recent';
const GROUP_MENU_WIDTH = 240;
const SESSION_MENU_PORTAL_STYLE: CSSProperties = {
  zIndex: 'calc(var(--web-shell-popover-z-index, 1000) + 1)',
};
const GROUP_MENU_MARGIN = 8;
const CUSTOM_GROUP_COLOR_OPTION = '__custom__';
const DEFAULT_CUSTOM_GROUP_COLOR: DaemonSessionGroupHexColor = '#416ef5';
type SidebarSessionSource = 'default' | 'channel';

interface StandaloneSessionRowAdapter {
  active: boolean;
  busy: boolean;
  isArchived: boolean;
  onOpen: () => void;
  onRename: () => void;
  onExport: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
}

function isScheduledTaskSession(session: DaemonSessionSummary): boolean {
  return (
    session.sourceType === 'scheduled_task' ||
    getScheduledTaskSessionGroup(session) !== undefined
  );
}

function getSessionIdentity(
  sessionId: string,
  workspaceCwd: string | undefined,
): string {
  return `${workspaceCwd ?? ''}\0${sessionId}`;
}

/** A catalog page the pin overlay drop check reads; undefined while the
 * query is disabled or unloaded. */
type PinCatalogPage = DaemonSessionSummary[] | undefined;

/** A pin toggle applied optimistically before the daemon RPC settles. */
interface OptimisticPinEntry {
  /** Session snapshot captured at toggle time, for rendering the row. */
  session: DaemonSessionSummary;
  pinned: boolean;
  /** Pin timestamp assigned optimistically (present when pinning). */
  pinnedAt?: string;
  rpcSettled: boolean;
}

export type WebShellSidebarFooterItem =
  | 'settings'
  | 'update'
  | 'version'
  | 'theme'
  | 'sessionsOverview'
  | 'workspacesOverview'
  | 'splitView'
  | 'daemonStatus'
  | 'localFiles'
  | 'desktopRelay'
  | 'collapse';

export interface WebShellSidebarBranding {
  /** Replace the complete top branding row. */
  render?: () => ReactNode;
  /** Hide the branding row in the compact drawer. Defaults to false. */
  hideWhenCompact?: boolean;
}

export interface WebShellSidebarLockedWorkspace {
  /** Replace the locked workspace row content while preserving its built-in behavior. */
  render?: (
    workspace: DaemonWorkspaceCapability,
    state: { expanded: boolean },
  ) => ReactNode;
}

export type WebShellSidebarPrimaryNavItem =
  | 'newTask'
  | 'agents'
  | 'plugins'
  | 'channels'
  | 'channelEvents'
  | 'live'
  | 'scheduledTasks'
  | 'prWatches'
  | 'workflows'
  | 'goals'
  | 'managed';

export interface WebShellSidebarPrimaryNavOptions {
  /** Built-in primary nav entries to show. Embedded hosts default to New session only. */
  items?: readonly WebShellSidebarPrimaryNavItem[];
  /** Additional custom content rendered after the built-in nav buttons. */
  render?: () => ReactNode;
}

export interface WebShellSidebarFooterOptions {
  /** Built-in footer entries to expose. Entries use the canonical footer order. */
  items?: readonly WebShellSidebarFooterItem[];
  /** Additional custom content rendered before the built-in footer items (left side). */
  render?: () => ReactNode;
}

export const DEFAULT_FOOTER_ITEMS: readonly WebShellSidebarFooterItem[] = [
  'settings',
  'update',
  'version',
  'theme',
  'sessionsOverview',
  'splitView',
  'daemonStatus',
  'localFiles',
  'desktopRelay',
  'collapse',
];

// The desktop shell always spawns its own loopback daemon, whose regular tools
// already reach the local disk and desktop, so neither bridge has anything to
// add there — and on WebKit webviews the local-files one could only ever render
// a dead entry. An explicit `footer.items` still wins, so both stay reachable.
export const DESKTOP_DEFAULT_FOOTER_ITEMS: readonly WebShellSidebarFooterItem[] =
  DEFAULT_FOOTER_ITEMS.filter(
    (item) => item !== 'localFiles' && item !== 'desktopRelay',
  );

export const DEFAULT_PRIMARY_NAV_ITEMS: readonly WebShellSidebarPrimaryNavItem[] =
  [
    'newTask',
    'agents',
    'plugins',
    'channels',
    'channelEvents',
    'live',
    'scheduledTasks',
    'prWatches',
    'workflows',
    'goals',
    'managed',
  ];

export type WebShellSidebarSessionActionItem =
  | 'details'
  | 'rename'
  | 'group'
  | 'export'
  | 'delete'
  | 'pin'
  | 'split'
  | 'archive';

/** Subset of action items that have working inline (hover-button) handlers. */
export type WebShellSidebarSessionInlineActionItem =
  | 'pin'
  | 'rename'
  | 'export'
  | 'delete';

export interface WebShellSidebarSessionActionsOptions {
  /** Session action items to show. Defaults to all. */
  items?: readonly WebShellSidebarSessionActionItem[];
  /**
   * Which items appear as inline buttons on standard session rows (on hover).
   * Defaults to ['pin'];
   * archive stays in the dropdown so a stray click on the hover slot cannot
   * archive a session.
   * Only items that also pass their built-in visibility condition are rendered.
   * Only items with working inline handlers are accepted
   * (details/group/archive/split are dropdown-only).
   * Recent sessions use dedicated Pin and Archive buttons instead of this
   * layout; the items policy still controls whether those actions are enabled.
   * Archived rows use Export and Restore inline, independently of this option.
   */
  inlineItems?: readonly WebShellSidebarSessionInlineActionItem[];
}

export const DEFAULT_SESSION_ACTION_ITEMS: readonly WebShellSidebarSessionActionItem[] =
  ['details', 'rename', 'group', 'export', 'delete', 'pin', 'archive', 'split'];

const DEFAULT_INLINE_ACTION_ITEMS: readonly WebShellSidebarSessionInlineActionItem[] =
  ['pin'];

/**
 * Palette order for the quick color-grouping buckets. Mirrors core's
 * `GROUP_COLOR_OPTIONS`; kept as a local constant so the client never imports
 * from core. Used both to order the color sections and as a fallback when the
 * daemon's color catalog has not loaded yet.
 */
const SESSION_GROUP_COLORS: DaemonSessionGroupPresetColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
];

type GroupEditorMode = 'create' | 'edit';

type SessionSectionKind = 'color' | 'group' | 'scheduled-task' | 'recent';

interface SessionSection {
  id: string;
  kind: SessionSectionKind;
  label: string;
  countLabel?: string;
  color?: DaemonSessionGroupColor;
  group?: DaemonSessionGroup;
  sessions: DaemonSessionSummary[];
}

interface GroupEditorState {
  mode: GroupEditorMode;
  group?: DaemonSessionGroup;
  targetSession?: DaemonSessionSummary;
  workspaceCwd?: string;
}

interface GroupMenuState {
  session: DaemonSessionSummary;
  top: number;
  left: number;
}

type SessionWorkspaceScope =
  | { kind: 'primary'; cwd: string }
  | { kind: 'locked'; cwd: string; workspace: DaemonWorkspaceCapability }
  | { kind: 'restricted'; cwd: string; workspace: DaemonWorkspaceCapability }
  | { kind: 'untrusted'; cwd: string; workspace: DaemonWorkspaceCapability }
  | { kind: 'unknown'; cwd: string };

export interface WebShellSidebarWorkspaceOverviewOptions {
  /**
   * Facet chips under an expanded workspace row. Defaults to every facet
   * except hooks.
   */
  items?: readonly WorkspaceOverviewItem[];
}

export type { WorkspaceManagementTarget, WorkspaceOverviewItem };

interface WebShellSidebarProps {
  collapsed: boolean;
  layout?: 'single' | 'rail';
  activePage?: string;
  containerWidth?: number;
  onOpenHome?: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenSettings: () => void;
  onOpenAgents?: (view?: 'agents' | 'squads' | 'runtime') => void;
  onOpenPlugins: () => void;
  onOpenChannels: () => void;
  /** Opens the cross-Channel event timeline; absent when the host does not
   * offer it. */
  onOpenChannelEvents?: () => void;
  onOpenLive?: () => void;
  onLiveVoiceSlotChange?: (element: HTMLDivElement | null) => void;
  onOpenManagedSessions?: () => void;
  onOpenDaemonStatus: () => void;
  onOpenScheduledTasks: () => void;
  /** Opens the PR watches page; absent when the daemon does not list
   * `/autofix-pr` watches (`autofix_pr_watches`). */
  onOpenPrWatches?: () => void;
  onOpenWorkflows: () => void;
  onOpenGoals: () => void;
  onOpenSessions: () => void;
  /**
   * Whether to offer the Session Overview entry point. The table handles
   * narrow widths, so the entry point can be offered at every viewport size.
   */
  canOpenSessionsOverview?: boolean;
  /** Opens the Workspaces overview panel (table of registered workspaces). */
  onOpenWorkspacesOverview?: () => void;
  onOpenSplitView: () => void;
  onAddSessionToSplitView?: (sessionId: string) => void;
  splitSessionIds?: readonly string[];
  /** Whether to offer the in-window split view (large screens only). */
  canOpenSplitView?: boolean;
  onNewSession: (workspaceCwd?: string) => Promise<boolean> | boolean;
  onNewStandaloneSession?: () => Promise<boolean> | boolean;
  onLoadSession: (
    sessionId: string,
    workspaceCwd?: string,
  ) => Promise<void> | void;
  /**
   * Opens a session listed by a fan-out host group (#13727): the caller
   * focuses that host in-app and loads the session there. When absent, the
   * groups fall back to full navigation via `openHostedWorkspace`.
   */
  onOpenHostSession?: (
    origin: string,
    sessionId: string,
    workspaceCwd?: string,
  ) => void;
  onSelectCurrentSession?: () => void;
  onSessionArchived?: (sessionId: string, workspaceCwd: string) => void;
  onSessionRenameConfirmed?: (
    workspaceCwd: string | undefined,
    sessionId: string,
    displayName: string,
  ) => void;
  /**
   * `attachedSessionId` is the session this client was attached to when the
   * delete was confirmed. The daemon publishes the terminal `session_closed`
   * frame before the delete request resolves, so the attachment is no longer
   * readable off the connection by the time this callback runs (#12619).
   */
  onSessionsDeleted?: (
    sessionIds: string[],
    meta?: { attachedSessionId?: string },
  ) => void;
  onError: (error: unknown, fallback: string) => void;
  theme: WebShellTheme;
  onThemeChange: (theme: WebShellTheme) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /**
   * Phase 4: workspace cwd picked for the next new session (undefined =
   * primary). Only meaningful on multi-workspace daemons.
   */
  selectedWorkspaceCwd?: string;
  onSelectWorkspace?: (workspaceCwd: string | undefined) => void;
  /**
   * Open the working-tree Changes dialog for a workspace. Forwarded to each
   * trusted workspace's hover details, where the branch row fires it from the
   * workspace's Git picker. Omit it and the row stays a plain-text summary.
   */
  onOpenGitDiff?: (workspaceCwd: string) => void;
  /** Commit entry for the same picker; the row still opens without it. */
  onOpenCommit?: (workspaceCwd: string) => void;
  /**
   * Opens the shared App-owned Add Workspace dialog. Omit this callback when
   * registration is unavailable; locked workspaces hide the action separately.
   */
  onOpenAddWorkspace?: () => void;
  workspaces?: DaemonWorkspaceCapability[];
  lockedWorkspaceCwd?: string;
  lockedWorkspace?: WebShellSidebarLockedWorkspace;
  branding?: false | WebShellSidebarBranding;
  primaryNav?: WebShellSidebarPrimaryNavOptions;
  /** Replace daemon history with navigation owned by an external session provider. */
  sessionContent?: ReactNode;
  sessionHeader?: ReactNode;
  managedWorkspaces?: ReactNode;
  canOpenSettings?: boolean;
  archivedSessionsTarget?: HTMLElement | null;
  managedArchivedSessions?: ManagedArchivedSessionsStatus & {
    content: ReactNode;
  };
  onSearchQueryChange?: (query: string) => void;
  /** Selection styling only; the attached session still owns its actions. */
  currentSessionActive?: boolean;
  /** Whether to show the Tasks/Channels session-source switch. Defaults to true. */
  showSessionSourceSwitch?: boolean;
  /** Show Live conversations and, in rail layout, the Live entry. Defaults to false. */
  showLive?: boolean;
  /** Whether to hide the "Workspaces" header row (with search and add workspace). Defaults to false (shown). */
  hideProjectHeader?: boolean;
  /** Customize which action buttons appear on session rows. */
  sessionActions?: WebShellSidebarSessionActionsOptions;
  footer?: false | WebShellSidebarFooterOptions;
  /**
   * Session counts, full path and facet chips on workspace rows. Pass `false`
   * to keep the plain folder headers.
   */
  workspaceOverview?: false | WebShellSidebarWorkspaceOverviewOptions;
  /**
   * Open a management page (MCP, skills, …) for a workspace. Offered on the
   * daemon's primary workspace only: the management pages read the
   * connection's bound workspace, so another workspace's row cannot open its
   * own view yet (#10399, layer B1).
   */
  onOpenWorkspaceManagement?: (
    target: WorkspaceManagementTarget,
    workspaceCwd: string,
  ) => void;
  /** Start a new session that works in an isolated git worktree. */
  onNewWorktreeSession?: (
    workspaceCwd?: string,
  ) => Promise<boolean> | boolean | void;
  projectFeaturesEnabled?: boolean;
  onLoadStandaloneSession?: (
    sessionId: string,
    displayName?: string,
  ) => Promise<void> | void;
  onStandaloneNotice?: (message: string) => void;
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getWorkspaceName(workspaceCwd: string | undefined): string {
  if (!workspaceCwd) return '';
  const parts = workspaceCwd.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? workspaceCwd;
}

function getSessionLabel(session: DaemonSessionSummary): string {
  const displayName = session.displayName?.trim();
  return displayName || session.sessionId.slice(0, 8);
}

function getCompactSessionLabel(session: DaemonSessionSummary): string {
  const normalized = getSessionLabel(session).replace(/\s+/g, ' ').trim();
  if (normalized.length <= DIALOG_SESSION_LABEL_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized
    .slice(0, DIALOG_SESSION_LABEL_MAX_LENGTH - 3)
    .trimEnd()}...`;
}

function getSessionCreatedTime(session: DaemonSessionSummary): number {
  if (!session.createdAt) return 0;
  const time = Date.parse(session.createdAt);
  return Number.isFinite(time) ? time : 0;
}

function getDefaultGroupColor(
  colorOptions: DaemonSessionGroupPresetColor[],
): DaemonSessionGroupPresetColor {
  return colorOptions[0] ?? 'blue';
}

function normalizeHexColorInput(
  value: string,
): DaemonSessionGroupHexColor | undefined {
  const normalized = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toLowerCase() as DaemonSessionGroupHexColor;
  }
  return undefined;
}

function normalizeGroupColorInput(
  value: string,
  presets: readonly DaemonSessionGroupPresetColor[],
): DaemonSessionGroupColor | undefined {
  const normalized = value.trim();
  if (presets.includes(normalized as DaemonSessionGroupPresetColor)) {
    return normalized as DaemonSessionGroupPresetColor;
  }
  return normalizeHexColorInput(normalized);
}

function getGroupColorClass(
  color: DaemonSessionGroupColor,
): string | undefined {
  if (color.startsWith('#')) return styles.groupColorCustom;
  switch (color) {
    case 'red':
      return styles.groupColorRed;
    case 'orange':
      return styles.groupColorOrange;
    case 'yellow':
      return styles.groupColorYellow;
    case 'green':
      return styles.groupColorGreen;
    case 'blue':
      return styles.groupColorBlue;
    case 'purple':
      return styles.groupColorPurple;
  }
  return undefined;
}

function getGroupColorStyle(
  color: DaemonSessionGroupColor,
): CSSProperties | undefined {
  return color.startsWith('#') ? { backgroundColor: color } : undefined;
}

// The cap scales with the window so wide displays can reveal full session
// names, but never exceeds half the window so the sidebar cannot crush the
// main content area. SIDEBAR_MAX_WIDTH is the floor, preserving the old
// fixed cap on small windows.
function getSidebarMaxWidth(): number {
  if (typeof window === 'undefined') return SIDEBAR_MAX_WIDTH;
  return Math.max(
    SIDEBAR_MAX_WIDTH,
    Math.floor(window.innerWidth * SIDEBAR_MAX_WIDTH_WINDOW_RATIO),
  );
}

function clampSidebarWidth(width: number, minWidth: number): number {
  return Math.min(getSidebarMaxWidth(), Math.max(minWidth, width));
}

// The sidebar never renders wider than half its container (the CSS width
// cap), so the drag paths clamp to the container-aware cap: persisting a width
// beyond it would store a value the user never saw. The stored preference
// keeps the window-derived cap (`clampSidebarWidth`), so a temporarily narrow
// host cannot shrink it.
function getSidebarDragMaxWidth(containerWidth?: number): number {
  const windowMax = getSidebarMaxWidth();
  if (typeof window === 'undefined') return windowMax;
  return Math.min(
    windowMax,
    Math.floor(
      Math.min(window.innerWidth, containerWidth ?? window.innerWidth) / 2,
    ),
  );
}

function clampSidebarVisualWidth(
  width: number,
  minWidth: number,
  containerWidth?: number,
): number {
  return Math.min(
    getSidebarDragMaxWidth(containerWidth),
    Math.max(minWidth, width),
  );
}

function readSidebarWidth(defaultWidth: number, minWidth: number): number {
  if (typeof window === 'undefined') return defaultWidth;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const width = raw ? Number(raw) : defaultWidth;
    return Number.isFinite(width)
      ? clampSidebarWidth(width, minWidth)
      : defaultWidth;
  } catch {
    return defaultWidth;
  }
}

function writeSidebarWidth(width: number): void {
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // localStorage can be unavailable in private or embedded contexts.
  }
}

function IconNewChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Qwen brand mark. Same artwork as the browser-tab favicon in index.html and
 * the QwenLM GitHub avatar; inlined as an SVG rather than hot-linked because
 * the Web Shell CSP is `img-src 'self' data: blob:` (see web-shell-static.ts),
 * which blocks remote images. The blue #082DFF fill is legible on both the
 * light and dark sidebar backgrounds. Filled (not stroked) so it opts out of
 * the shared `.navIcon svg` stroke styling.
 */
function IconQwenLogo() {
  return (
    <img
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAErWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMTkyIgogICB0aWZmOkltYWdlV2lkdGg9IjE5MiIKICAgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIKICAgdGlmZjpYUmVzb2x1dGlvbj0iNzIvMSIKICAgdGlmZjpZUmVzb2x1dGlvbj0iNzIvMSIKICAgZXhpZjpQaXhlbFhEaW1lbnNpb249IjE5MiIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjE5MiIKICAgZXhpZjpDb2xvclNwYWNlPSIxIgogICBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIgogICBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiCiAgIHhtcDpNb2RpZnlEYXRlPSIyMDI2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"
      alt=""
      aria-hidden="true"
    />
  );
}

function BrandLogoImage({ dataUri }: { dataUri: string }) {
  // A data URI the browser cannot decode (malformed XML, an xmlns-less root)
  // fires `error` and otherwise leaves a blank 28x28 box where the product mark
  // was. Fall back to the built-in mark — the same outcome a daemon-rejected
  // logo produces — instead of rendering nothing. But warn first: this is the
  // one failure the daemon's checks cannot see (it validates the root tag
  // only, never parses the body), so without a signal the white-labeled shell
  // silently shows the built-in mark beside the operator's own name forever.
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <IconQwenLogo />;
  }
  return (
    <img
      src={dataUri}
      alt=""
      onError={() => {
        console.warn(
          '[web-shell] brand logo could not be rendered; falling back to the built-in mark',
        );
        setFailed(true);
      }}
    />
  );
}

function IconChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {expanded ? <path d="m6 9 6 6 6-6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

function SessionMenu({
  onOpenChange,
  children,
}: {
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const openRef = useRef(false);
  useEffect(
    () => () => {
      // Radix emits no onOpenChange(false) when an open menu unmounts (its
      // row removed by a poll or preview slice); without the close signal the
      // collapsed surface's dismissal guards stay blocked forever.
      if (openRef.current) onOpenChange(false);
    },
    [onOpenChange],
  );
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        openRef.current = open;
        onOpenChange(open);
      }}
    >
      {children}
    </DropdownMenu>
  );
}

function SidebarSessionSurface({
  collapsed,
  label,
  status,
  statusLabel,
  width,
  open,
  onOpenChange,
  isCloseBlocked,
  home,
  children: defaultChildren,
  content,
  header,
}: {
  collapsed: boolean;
  label: string;
  status?: 'approval' | 'question' | 'completed';
  statusLabel?: string;
  width: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCloseBlocked: () => boolean;
  home?: {
    anchor: RefObject<HTMLButtonElement | null>;
    hidden: boolean;
    section: 'home' | 'channels' | 'live';
  };
  children: ReactNode;
  content?: ReactNode;
  header?: ReactNode;
}) {
  const children = (
    <>
      {header}
      {content === undefined ? defaultChildren : content}
    </>
  );
  const closeTimerRef = useRef<number | undefined>(undefined);
  const pointerOpenRef = useRef(false);
  const interactionOpenRef = useRef(false);
  const focusInsideSurfaceRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = home?.anchor ?? triggerRef;
  if (home && open) pointerOpenRef.current = true;
  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isCloseBlocked()) return;
      if (nextOpen && !open) focusInsideSurfaceRef.current = false;
      onOpenChange(nextOpen);
    },
    [isCloseBlocked, onOpenChange, open],
  );
  const cancelClose = useCallback(
    () => window.clearTimeout(closeTimerRef.current),
    [],
  );
  const closeAfterDelay = useCallback(() => {
    cancelClose();
    if (!pointerOpenRef.current) return;
    closeTimerRef.current = window.setTimeout(() => {
      // A hover-out must not unmount the surface while it holds keyboard
      // focus (search or rename inputs): the close would drop focus to body.
      // document.activeElement retargets to the shadow host in shadow-DOM
      // portal mode, so also probe the surface's own tree for :focus.
      if (
        contentRef.current?.contains(document.activeElement) ||
        contentRef.current?.querySelector(':focus')
      ) {
        return;
      }
      changeOpen(false);
    }, 150);
  }, [cancelClose, changeOpen]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    if (!collapsed || !open) return;
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerOpenRef.current) return;
      // Shadow-DOM portal mode retargets event.target to the shadow host;
      // composedPath keeps the real node (same approach as App.tsx).
      const target =
        (event.composedPath()[0] as Node | undefined) ?? event.target;
      const insideSurface =
        target instanceof Node &&
        (anchorRef.current?.contains(target) ||
          contentRef.current?.contains(target));
      const insideNestedOverlay =
        target instanceof Element &&
        target.closest(
          '[data-slot="dropdown-menu-content"], [data-slot="popover-content"]',
        );
      if (!insideSurface && !insideNestedOverlay) {
        closeAfterDelay();
      } else {
        cancelClose();
      }
    };
    document.addEventListener('pointermove', handlePointerMove);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      window.clearTimeout(closeTimerRef.current);
    };
  }, [anchorRef, cancelClose, closeAfterDelay, collapsed, open]);

  const surfaceContent = home ? (
    <div
      className={styles.homeColumn}
      hidden={home.hidden && !open}
      data-web-shell-home-column
      data-web-shell-sidebar-section={home.section}
    >
      {children}
    </div>
  ) : (
    children
  );
  if (!collapsed || (home && !open)) {
    return home ? (
      surfaceContent
    ) : (
      <div className={styles.sessionList}>{children}</div>
    );
  }

  return (
    <div className={home ? styles.homePopoverAnchor : styles.sessionList}>
      <Popover open={open} onOpenChange={changeOpen}>
        {home ? (
          home.anchor.current && (
            <PopoverAnchor virtualRef={{ current: home.anchor.current }} />
          )
        ) : (
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              className={styles.pluginButton}
              type="button"
              aria-label={statusLabel ? `${label}: ${statusLabel}` : label}
              data-web-shell-collapsed-session-trigger
              onPointerEnter={() => {
                // Only an open initiated by the pointer uses hover semantics;
                // a graze over a keyboard-opened switcher must not suppress
                // focus restoration when it later closes.
                if (!open) pointerOpenRef.current = true;
                cancelClose();
                changeOpen(true);
              }}
              onPointerLeave={closeAfterDelay}
              onPointerDown={() => {
                if (!open) pointerOpenRef.current = true;
              }}
              onClick={(event) => {
                event.preventDefault();
                cancelClose();
                changeOpen(true);
              }}
              onKeyDown={() => {
                pointerOpenRef.current = false;
              }}
            >
              <span className={styles.navIcon}>
                <FolderClosedIcon size={16} strokeWidth={1.2} />
                {status && (
                  <span
                    className={cx(
                      styles.collapsedSessionStatusDot,
                      status === 'approval' &&
                        styles.collapsedSessionStatusApproval,
                      status === 'question' &&
                        styles.collapsedSessionStatusQuestion,
                    )}
                    data-web-shell-collapsed-session-status={status}
                    aria-hidden="true"
                  />
                )}
              </span>
            </button>
          </PopoverTrigger>
        )}
        <PopoverContent
          ref={contentRef}
          side="right"
          align="start"
          sideOffset={home ? 16 : 8}
          collisionPadding={8}
          onFocus={() => {
            focusInsideSurfaceRef.current = true;
          }}
          className={
            home
              ? cx(styles.sidebar, styles.railLayout, styles.homePopover)
              : styles.collapsedSessionPopover
          }
          style={
            {
              '--collapsed-session-popover-width': `${width}px`,
            } as CSSProperties
          }
          aria-label={home ? label : undefined}
          data-web-shell-home-popover={home ? '' : undefined}
          data-web-shell-collapsed-session-switcher={home ? undefined : ''}
          onOpenAutoFocus={(event) => {
            if (pointerOpenRef.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            // Suppress Radix's focus restoration only while focus stayed
            // outside a pointer-opened surface; once focus has moved into
            // the content (search, rename), closing must return it to the
            // trigger like a keyboard-opened surface. Radix fires this
            // after the content unmounts, so the flag is tracked while the
            // surface is open instead of probed from document.activeElement.
            if (pointerOpenRef.current && !focusInsideSurfaceRef.current) {
              event.preventDefault();
            }
            pointerOpenRef.current = false;
            interactionOpenRef.current = false;
            focusInsideSurfaceRef.current = false;
          }}
          onEscapeKeyDown={() => {
            interactionOpenRef.current = false;
            if (home && focusInsideSurfaceRef.current) {
              home.anchor.current?.focus();
            }
          }}
          onPointerEnter={cancelClose}
          onPointerLeave={closeAfterDelay}
          onPointerDownCapture={() => {
            interactionOpenRef.current = true;
            cancelClose();
          }}
          onInteractOutside={(event) => {
            const originalEvent = event.detail.originalEvent;
            const originalTarget = originalEvent.composedPath()[0];
            const target = (originalTarget as Node | undefined) ?? event.target;
            if (
              target instanceof Element &&
              target.closest(
                '[data-slot="dropdown-menu-content"], [data-slot="popover-content"]',
              )
            ) {
              event.preventDefault();
            } else if (
              interactionOpenRef.current &&
              originalEvent.type === 'focusin'
            ) {
              event.preventDefault();
            } else {
              interactionOpenRef.current = false;
            }
          }}
        >
          {surfaceContent}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function WebShellSidebar({
  collapsed,
  layout = 'single',
  activePage = 'home',
  containerWidth,
  onOpenHome,
  onCollapsedChange,
  onOpenSettings,
  canOpenSettings,
  onOpenAgents,
  onOpenPlugins,
  onOpenChannels,
  onOpenChannelEvents,
  onOpenLive,
  onLiveVoiceSlotChange,
  onOpenManagedSessions,
  onOpenDaemonStatus,
  onOpenScheduledTasks,
  onOpenPrWatches,
  onOpenWorkflows,
  onOpenGoals,
  onOpenSessions,
  canOpenSessionsOverview,
  onOpenWorkspacesOverview,
  onOpenSplitView,
  onAddSessionToSplitView,
  splitSessionIds,
  canOpenSplitView,
  onNewSession,
  onNewStandaloneSession,
  onLoadSession,
  onOpenHostSession,
  onSelectCurrentSession,
  onSessionArchived,
  onSessionRenameConfirmed,
  onSessionsDeleted,
  onError,
  theme,
  onThemeChange,
  mobileOpen,
  onMobileClose,
  selectedWorkspaceCwd,
  onSelectWorkspace,
  onOpenGitDiff,
  onOpenCommit,
  onOpenAddWorkspace,
  workspaces: providedWorkspaces,
  lockedWorkspaceCwd,
  lockedWorkspace: lockedWorkspaceOptions,
  branding,
  primaryNav: primaryNavOptions,
  sessionContent,
  sessionHeader,
  managedWorkspaces,
  managedArchivedSessions,
  archivedSessionsTarget,
  onSearchQueryChange,
  currentSessionActive = true,
  showSessionSourceSwitch = true,
  showLive = false,
  hideProjectHeader,
  sessionActions: sessionActionsOptions,
  footer,
  workspaceOverview,
  onOpenWorkspaceManagement,
  onNewWorktreeSession,
  projectFeaturesEnabled = true,
  onLoadStandaloneSession,
  onStandaloneNotice,
}: WebShellSidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [homePreviewOpen, setHomePreviewOpen] = useState(false);
  const homeTriggerRef = useRef<HTMLButtonElement>(null);
  const [updateSlot, setUpdateSlot] = useState<HTMLDivElement | null>(null);
  const [desktopRelaySlot, setDesktopRelaySlot] =
    useState<HTMLDivElement | null>(null);
  const [localFilesSlot, setLocalFilesSlot] = useState<HTMLDivElement | null>(
    null,
  );
  // The rail subtree owns the More popover; a layout change unmounts that
  // owner, so reset alongside mobileOpen/collapsed/activePage — or the rail
  // returns with a phantom menu the user never reopened.
  useEffect(() => {
    setMoreOpen(false);
    setHomePreviewOpen(false);
  }, [mobileOpen, collapsed, activePage, layout]);
  const railLayout = layout === 'rail';
  const [navigationHint, setNavigationHint] =
    useState<HTMLButtonElement | null>(null);
  // Every other clear site is a DOM handler on the rail `<nav>`, and removed
  // elements fire neither pointerout nor blur — so an unmounted rail (or just
  // an unmounted hinted button, when its feature gate flips) would leave the
  // tooltip Popover open against a detached node, painting a stale label at
  // the viewport origin when the rail returns. No dependency array: a dep
  // list cannot observe a child's unmount, and the early return keeps this
  // free on every render that has no hint to drop.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- must re-check every render: the hinted button can unmount while both deps stay unchanged
  useEffect(() => {
    if (navigationHint === null) return;
    if (!railLayout || !navigationHint.isConnected) setNavigationHint(null);
  });
  // Column-restoring entries (Home, Channels, Live) must leave the collapsed
  // state behind or a collapsed user's click appears to do nothing; full-page
  // entries keep the column hidden regardless, so they leave the persisted
  // collapse preference untouched. Only an actually collapsed rail restores:
  // the mobile drawer forces `collapsed` false, and writing the expansion
  // from there would silently clear the user's desktop collapse preference.
  const openNavigation = (
    open: (() => void) | undefined,
    restoresColumn = false,
  ) => {
    if (railLayout) {
      setMoreOpen(false);
      setHomePreviewOpen(false);
      if (restoresColumn && collapsed) onCollapsedChange(false);
    }
    open?.();
  };
  const { t } = useI18n();
  const brand = useBrand();
  const brandName = useBrandName();
  const connection = useConnection();
  const actions = useActions();
  const workspaceActions = useWorkspaceActions();
  const workspace = useWorkspace();
  const generatedUiOwner = useContext(McpAppGeneratedUiOwnerContext);
  // Fixed per-origin rank for host groups (#13727): every connected host,
  // including the focused one, occupies its stable position regardless of
  // focus, so switching hosts never reshuffles the sidebar.
  const fanoutOrigins = useFanoutOrigins();
  const focusedHostOrigin = useMemo(
    () => workspace.baseUrl || window.location.origin,
    [workspace.baseUrl],
  );
  const rankedHostOrigins = useMemo(
    () => [...new Set([...fanoutOrigins, focusedHostOrigin])].sort(),
    [fanoutOrigins, focusedHostOrigin],
  );
  const rankOfHost = useCallback(
    (origin: string) => rankedHostOrigins.indexOf(origin) + 1,
    [rankedHostOrigins],
  );
  const livePresence = useLivePresence(workspace.client);
  const sessionCatalogController = useSessionCatalogController(
    workspace.client,
  );
  const footerItems = useMemo(
    () =>
      new Set(
        footer === false
          ? []
          : (footer?.items ??
            (isDesktopShell()
              ? DESKTOP_DEFAULT_FOOTER_ITEMS
              : DEFAULT_FOOTER_ITEMS)),
      ),
    [footer],
  );
  const primaryNavItems = useMemo(
    () => new Set(primaryNavOptions?.items ?? DEFAULT_PRIMARY_NAV_ITEMS),
    [primaryNavOptions?.items],
  );
  const showUpdate =
    footerItems.has('update') &&
    !isDesktopShell() &&
    connection.capabilities?.features?.includes('daemon_update');
  const hasScrollingPrimaryNav =
    (projectFeaturesEnabled &&
      (primaryNavItems.has('plugins') ||
        (primaryNavItems.has('agents') && Boolean(onOpenAgents)) ||
        primaryNavItems.has('channels') ||
        (primaryNavItems.has('channelEvents') &&
          Boolean(onOpenChannelEvents)) ||
        (showLive && primaryNavItems.has('live') && Boolean(onOpenLive)) ||
        primaryNavItems.has('scheduledTasks') ||
        (primaryNavItems.has('prWatches') && Boolean(onOpenPrWatches)) ||
        primaryNavItems.has('workflows') ||
        primaryNavItems.has('goals'))) ||
    (primaryNavItems.has('managed') && Boolean(onOpenManagedSessions)) ||
    Boolean(primaryNavOptions?.render);
  const sessionActionItems = useMemo(
    () => new Set(sessionActionsOptions?.items ?? DEFAULT_SESSION_ACTION_ITEMS),
    [sessionActionsOptions?.items],
  );
  const inlineActionItems = useMemo(
    () =>
      new Set(
        sessionActionsOptions?.inlineItems ?? DEFAULT_INLINE_ACTION_ITEMS,
      ),
    [sessionActionsOptions?.inlineItems],
  );
  const shouldRenderBrand =
    branding !== false && !(mobileOpen && branding?.hideWhenCompact);
  const organizationEnabled = Boolean(
    sessionContent === undefined &&
      connection.capabilities?.features?.includes(SESSION_ORGANIZATION_FEATURE),
  );
  const sourceMetadataEnabled = Boolean(
    connection.capabilities?.features?.includes('session_source_metadata'),
  );
  const channelNavigationEnabled =
    railLayout &&
    projectFeaturesEnabled &&
    showSessionSourceSwitch &&
    sourceMetadataEnabled &&
    primaryNavItems.has('channels');
  const channelView =
    channelNavigationEnabled && activePage === 'channels' && !homePreviewOpen;
  const channelEventsNavigationEnabled =
    projectFeaturesEnabled && primaryNavItems.has('channelEvents');
  const liveNavigationEnabled =
    railLayout &&
    projectFeaturesEnabled &&
    showLive &&
    primaryNavItems.has('live') &&
    Boolean(onOpenLive);
  const liveView =
    liveNavigationEnabled && activePage === 'live' && !homePreviewOpen;
  const sectionView = channelView || liveView;
  const homeHidden =
    railLayout &&
    (collapsed || (activePage !== 'home' && !sectionView)) &&
    !mobileOpen;
  // Whenever the Home column is not the visible status surface — the collapsed
  // strip, the rail with a full page open, or the Live section column (which
  // lists no project sessions) — the rail/collapsed icon carries the attention
  // dot, so secondary-workspace status queries must run in those cases, not
  // only when collapsed. The Channels section still lists sessions with their
  // status, so it does not count as hidden.
  const statusSurfaceHidden = collapsed || homeHidden || liveView;
  const navigationExpanded = !collapsed;
  const [storedSessionSource, setSessionSource] =
    useState<SidebarSessionSource>('default');
  const sessionSource = channelNavigationEnabled
    ? channelView
      ? 'channel'
      : 'default'
    : storedSessionSource;
  // Reset before commit so effects that key bookkeeping by the raw source
  // cannot observe a hidden switch with channel state and default catalogs.
  if (!showSessionSourceSwitch && storedSessionSource !== 'default') {
    setSessionSource('default');
  }
  const selectedSessionSource = sourceMetadataEnabled
    ? showSessionSourceSwitch
      ? sessionSource
      : 'default'
    : undefined;
  const daemonAvailable = useDaemonAvailability() === 'available';
  const [archiveSessionSource, setArchiveSessionSource] =
    useState<SidebarSessionSource>('default');
  const archiveSourceType = sourceMetadataEnabled
    ? showSessionSourceSwitch
      ? archiveSessionSource
      : 'default'
    : undefined;
  const channelManagementEnabled = Boolean(
    workspace.capabilities?.features.includes('channel_management'),
  );
  const channelGroupingEnabled =
    sessionContent === undefined &&
    selectedSessionSource === 'channel' &&
    channelManagementEnabled;
  const {
    data: channelCatalogData,
    catalog: channelTypeCatalog,
    channels: channelInstances,
    reload: reloadChannelCatalog,
    error: channelCatalogError,
  } = useChannels({
    autoLoad: channelGroupingEnabled,
    enabled: channelGroupingEnabled,
  });
  const sessionArchiveEnabled = Boolean(
    connection.capabilities?.features?.includes('session_archive'),
  );
  const workspaceQualifiedRestCoreEnabled = Boolean(
    connection.capabilities?.features?.includes(
      'workspace_qualified_rest_core',
    ),
  );
  const workspaceSessionLiveStateSupported = Boolean(
    sessionContent === undefined &&
      connection.capabilities?.features?.includes(
        'workspace_session_live_state',
      ) &&
      typeof workspace.client.getWorkspaceSessionLiveState === 'function',
  );
  const sessionCatalogRequestsEnabled =
    sessionContent === undefined && connection.capabilities !== undefined;
  const workspaceSessionMetadataEnabled = Boolean(
    connection.capabilities?.features?.includes('workspace_session_metadata'),
  );
  // Phase 4: registered workspaces on a multi-workspace daemon (absent or a
  // single entry otherwise). Drives the new-session workspace picker.
  const workspaces = useMemo(
    () => providedWorkspaces ?? workspace.capabilities?.workspaces ?? [],
    [providedWorkspaces, workspace.capabilities?.workspaces],
  );
  // Display-only ordering preference, scoped per daemon host so two hosts
  // never share one list. Workspaces the stored order does not mention (new
  // registrations) keep the daemon's order after the listed ones.
  const workspaceOrderScope = useMemo(
    () => (workspace.baseUrl || window.location.origin).replace(/\/+$/, ''),
    [workspace.baseUrl],
  );
  const [workspaceOrder, setWorkspaceOrder] = useState<string[]>(() =>
    readWorkspaceOrder(workspaceOrderScope),
  );
  useEffect(() => {
    setWorkspaceOrder(readWorkspaceOrder(workspaceOrderScope));
  }, [workspaceOrderScope]);
  const workspaceCatalogAdvertised =
    workspaces.length > 0 ||
    workspace.capabilities?.workspaces !== undefined ||
    connection.capabilities?.workspaces !== undefined;
  const primaryWorkspaceCwd =
    workspaces.find((entry) => entry.primary)?.cwd ??
    workspace.capabilities?.workspaceCwd ??
    connection.workspaceCwd;
  const primaryWorkspaceExpansionId = `primary:${
    primaryWorkspaceCwd ?? 'default'
  }`;
  const workspaceSessionActive =
    Boolean(connection.sessionId) &&
    (connection.sessionContext === undefined ||
      connection.sessionContext.kind === 'workspace');
  const workflowWorkspaceCwd = workspaceSessionActive
    ? connection.sessionContext?.kind === 'workspace'
      ? connection.sessionContext.cwd
      : connection.workspaceCwd
    : (lockedWorkspaceCwd ?? selectedWorkspaceCwd ?? primaryWorkspaceCwd);
  const workspaceWorkflowsEnabled =
    workspaces.find((entry) => entry.cwd === workflowWorkspaceCwd)
      ?.workflowsEnabled ?? false;
  const workflowsEnabled = workspaceSessionActive
    ? (connection.supportedCommands?.workflowsEnabled ??
      workspaceWorkflowsEnabled)
    : workspaceWorkflowsEnabled;
  const lockedWorkspace = lockedWorkspaceCwd
    ? workspaces.find((entry) => entry.cwd === lockedWorkspaceCwd)
    : undefined;
  const includePrimaryWorkspaceSessions =
    sessionContent === undefined &&
    (!lockedWorkspaceCwd || lockedWorkspace?.primary === true);
  const projectName =
    getWorkspaceName(connection.workspaceCwd) || t('sidebar.projectFallback');
  const displayedWorkspaces = useMemo<DaemonWorkspaceCapability[]>(() => {
    const availableWorkspaces =
      workspaces.length > 0
        ? workspaces
        : [
            {
              id: 'primary',
              cwd: connection.workspaceCwd || projectName,
              primary: true,
              trusted: true,
            },
          ];
    const visibleWorkspaces = showLive
      ? availableWorkspaces
      : availableWorkspaces.filter((entry) => entry.kind !== 'live');
    return lockedWorkspaceCwd
      ? visibleWorkspaces.filter((entry) => entry.cwd === lockedWorkspaceCwd)
      : visibleWorkspaces;
  }, [
    connection.workspaceCwd,
    lockedWorkspaceCwd,
    projectName,
    showLive,
    workspaces,
  ]);
  const liveStateWorkspaceCwds = useMemo(
    () =>
      displayedWorkspaces
        .filter(
          (entry) =>
            entry.kind !== 'live' && entry.trusted && isAbsolutePath(entry.cwd),
        )
        .map((entry) => entry.cwd),
    [displayedWorkspaces],
  );
  const liveStateWorkspaceCwdSet = useMemo(
    () => new Set(liveStateWorkspaceCwds),
    [liveStateWorkspaceCwds],
  );
  const liveStateGroupWorkspaceCwds = useMemo(
    () =>
      organizationEnabled && !channelGroupingEnabled
        ? displayedWorkspaces
            .filter(
              (entry) =>
                entry.kind !== 'live' &&
                entry.trusted &&
                isAbsolutePath(entry.cwd),
            )
            .map((entry) => entry.cwd)
        : [],
    [channelGroupingEnabled, displayedWorkspaces, organizationEnabled],
  );
  const workspaceSessionLiveStateEnabled =
    workspaceSessionLiveStateSupported && liveStateWorkspaceCwds.length > 0;
  const primaryWorkspaceSessionLiveStateEnabled = Boolean(
    workspaceSessionLiveStateEnabled &&
      primaryWorkspaceCwd &&
      liveStateWorkspaceCwdSet.has(primaryWorkspaceCwd),
  );
  const primaryWorkspaceLiveStateGroupsEnabled = Boolean(
    primaryWorkspaceSessionLiveStateEnabled &&
      primaryWorkspaceCwd &&
      liveStateGroupWorkspaceCwds.includes(primaryWorkspaceCwd),
  );
  const secondaryWorkspaceCwds = useMemo(
    () =>
      displayedWorkspaces
        .filter((entry) => !entry.primary && entry.trusted)
        .map((entry) => entry.cwd),
    [displayedWorkspaces],
  );
  const secondaryWorkspaceSessionLiveStateEnabled =
    workspaceSessionLiveStateEnabled &&
    secondaryWorkspaceCwds.length > 0 &&
    secondaryWorkspaceCwds.every((cwd) => liveStateWorkspaceCwdSet.has(cwd));
  const {
    sessions,
    loading,
    error,
    data: sessionsPage,
    nextCursor: sessionsNextCursor,
    truncated: sessionsTruncated,
    reload,
    deleteSession,
    exportSession,
    archiveSession,
    catalogQuery,
  } = useWebShellSessions({
    autoLoad:
      sessionCatalogRequestsEnabled && !primaryWorkspaceSessionLiveStateEnabled,
    enabled: includePrimaryWorkspaceSessions,
    pageSize: SESSION_LIST_PAGE_SIZE,
    archiveState: 'active',
    ...(selectedSessionSource ? { sourceType: selectedSessionSource } : {}),
    ...(organizationEnabled
      ? { view: 'organized' as const, group: 'all' }
      : {}),
  });
  // Header counts for the primary workspace, whose sessions this component
  // lists itself (the section only renders the folder header for it).
  const primarySessionStats = useMemo(
    () =>
      includePrimaryWorkspaceSessions && sessionsPage !== undefined
        ? summarizeSessions(
            sessions,
            // Either more pages follow, or the daemon capped its scan and
            // marked the page a lower bound.
            Boolean(sessionsNextCursor) || sessionsTruncated === true,
          )
        : undefined,
    [
      includePrimaryWorkspaceSessions,
      sessions,
      sessionsNextCursor,
      sessionsPage,
      sessionsTruncated,
    ],
  );
  // The catalog starts with loading=false before its subscription requests
  // data, so !loading is not “settled”. Treat the first data as the ready signal (empty
  // lists are still defined data) so the initial-catalog latch waits. Errors
  // must NOT settle it: a latch consumed against a failed request would treat
  // every section from the eventual successful reload as brand-new,
  // auto-collapsing and persisting over the user's restored expansions.
  const sessionsCatalogReady =
    !organizationEnabled ||
    !includePrimaryWorkspaceSessions ||
    sessionsPage !== undefined;
  // Which source the settled sessions page belongs to. Switching the source
  // changes the catalog query key, whose entry starts without a page
  // (undefined), so reconciliation must not run until a page fetched for the
  // new source settles — otherwise the other source's sections would be
  // consumed as the new source's initial catalog.
  const lastSettledSessionsPageRef = useRef(sessionsPage);
  const settledSessionsSourceRef = useRef<SidebarSessionSource>(sessionSource);
  useEffect(() => {
    // An undefined page is the empty pre-settle snapshot, not a settled fetch.
    if (sessionsPage === undefined) return;
    if (lastSettledSessionsPageRef.current !== sessionsPage) {
      lastSettledSessionsPageRef.current = sessionsPage;
      settledSessionsSourceRef.current = sessionSource;
    }
  }, [sessionsPage, sessionSource]);
  const loadPinnedSessions =
    organizationEnabled && selectedSessionSource !== 'channel';
  const { sessions: primaryPinnedSessions, data: primaryPinnedSessionsPage } =
    useWebShellSessions({
      autoLoad:
        sessionCatalogRequestsEnabled &&
        loadPinnedSessions &&
        !primaryWorkspaceSessionLiveStateEnabled,
      enabled: loadPinnedSessions && includePrimaryWorkspaceSessions,
      pageSize: SESSION_LIST_PAGE_SIZE,
      archiveState: 'active',
      ...(selectedSessionSource ? { sourceType: selectedSessionSource } : {}),
      view: 'organized',
      group: 'pinned',
    });
  const archivedExpanded = Boolean(archivedSessionsTarget);
  const [standaloneRefreshKey, setStandaloneRefreshKey] = useState(0);
  const [standaloneArchivedStatus, setStandaloneArchivedStatus] = useState({
    count: 0,
    loading: false,
    error: false,
  });
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  // Pin toggles applied optimistically while the daemon organization RPC is
  // in flight. The catalog store mirrors each toggle into its loaded pages
  // (applySessionPinToggle); these entries only render rows no loaded page
  // carries yet, and are dropped once one does or rolled back on RPC failure.
  const [optimisticPins, setOptimisticPins] = useState<
    ReadonlyMap<string, OptimisticPinEntry>
  >(() => new Map());
  const {
    sessions: archivedSessions,
    loading: archivedLoading,
    error: archivedError,
    reload: reloadArchived,
    deleteSession: deleteArchivedSession,
    unarchiveSession,
    catalogQuery: archivedCatalogQuery,
  } = useWebShellSessions({
    autoLoad:
      sessionCatalogRequestsEnabled && !primaryWorkspaceSessionLiveStateEnabled,
    enabled:
      sessionArchiveEnabled &&
      archivedExpanded &&
      includePrimaryWorkspaceSessions,
    pageSize: SESSION_LIST_PAGE_SIZE,
    archiveState: 'archived',
    ...(archiveSourceType ? { sourceType: archiveSourceType } : {}),
    ...(organizationEnabled
      ? { view: 'organized' as const, group: 'all' }
      : {}),
  });
  const [groups, setGroups] = useState<DaemonSessionGroup[]>([]);
  const [menuGroups, setMenuGroups] = useState<DaemonSessionGroup[]>([]);
  const [colorOptions, setColorOptions] = useState<
    DaemonSessionGroupPresetColor[]
  >([]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [editingSessionIdentity, setEditingSessionIdentity] = useState<
    string | null
  >(null);
  const [editingSession, setEditingSession] =
    useState<DaemonSessionSummary | null>(null);
  // Mirrors editingSessionIdentity for promise callbacks that outlive the
  // render where the rename started.
  const editingSessionIdentityRef = useRef<string | null>(null);
  // Drafts outlive the row: a catalog refresh can remount it (for example
  // the group catalog arriving after the session list), and the editor's
  // local state would otherwise fall back to the stored title. A ref, not
  // state, so recording a keystroke does not re-render the list.
  const renameDraftsRef = useRef(new Map<string, string>());
  const [busySessionIds, setBusySessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const busySessionIdsRef = useRef<Set<string>>(new Set());
  const [exportingSessionIds, setExportingSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const exportingSessionIdsRef = useRef<Set<string>>(new Set());
  const [creatingSession, setCreatingSession] = useState(false);
  const creatingSessionRef = useRef(false);
  // The workspace whose header menu is open: its action wrapper must stay
  // visible while the (portalled) menu holds hover and focus, or Escape
  // would return focus to a hidden trigger and strand it on the body.
  const [openWorkspaceMenuId, setOpenWorkspaceMenuId] = useState<string | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] =
    useState<DaemonSessionSummary | null>(null);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  const groupMenuOpenRef = useRef(groupMenu !== null);
  useEffect(() => {
    groupMenuOpenRef.current = groupMenu !== null;
  }, [groupMenu]);
  const [groupEditor, setGroupEditor] = useState<GroupEditorState | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState<DaemonSessionGroupColor>('blue');
  const [lastValidCustomGroupColor, setLastValidCustomGroupColor] =
    useState<DaemonSessionGroupHexColor>(DEFAULT_CUSTOM_GROUP_COLOR);
  const [deleteGroupCandidate, setDeleteGroupCandidate] = useState<{
    group: DaemonSessionGroup;
    workspaceCwd?: string;
  } | null>(null);
  const [collapsedSessionSectionIds, setCollapsedSessionSectionIds] = useState<
    Set<string>
  >(
    () =>
      new Set(
        Array.from(readCollapsedSessionSectionIds()).filter(
          isPrimaryCollapsedSectionId,
        ),
      ),
  );
  const knownSessionSectionIdsRef = useRef<Set<string>>(new Set());
  // Dedicated first-sync latch, keyed by session source: each source's first
  // settled catalog only registers section ids. Without per-source latches the
  // Tasks settle consumes the shared latch and the first Channels visit treats
  // every platform section as brand-new, auto-collapsing and persisting them.
  // Do not infer this from knownSessionSectionIdsRef.size — seeding that set
  // early would make the first real sync look mid-session and auto-collapse
  // restored expansions.
  const awaitingInitialSessionCatalogBySourceRef = useRef<
    Record<SidebarSessionSource, boolean>
  >({ default: true, channel: true });
  const [groupsCatalogReady, setGroupsCatalogReady] =
    useState(!organizationEnabled);
  // organizationEnabled can flip true mid-session (capabilities can land after
  // the flat sessions request settles). Close the gate during that same render:
  // deferring to the reload effect would let the auto-collapse effect consume
  // the first-sync latch against the stale pre-organized catalog first.
  const [prevOrganizationEnabled, setPrevOrganizationEnabled] =
    useState(organizationEnabled);
  if (prevOrganizationEnabled !== organizationEnabled) {
    setPrevOrganizationEnabled(organizationEnabled);
    setGroupsCatalogReady(!organizationEnabled);
    if (organizationEnabled) {
      // An org-disabled settle may already have consumed the Tasks latch
      // against scheduled-task sections alone — possibly while the Channels
      // tab was selected. Re-arm the source whose catalog gains manual
      // groups so the first organized settle registers them as initial
      // instead of collapsing them.
      awaitingInitialSessionCatalogBySourceRef.current.default = true;
    }
  }
  // The channel-grouping branch clears `groups` while the Channels tab is
  // selected; when switching back to Tasks, close the gate during that same
  // render so the settle cannot consume the first-sync latch against the
  // empty catalog before the organized groups reload lands.
  const [prevSessionSource, setPrevSessionSource] = useState(sessionSource);
  if (prevSessionSource !== sessionSource) {
    setPrevSessionSource(sessionSource);
    if (
      organizationEnabled &&
      sessionSource === 'default' &&
      channelManagementEnabled
    ) {
      setGroupsCatalogReady(false);
    }
  }
  const sidebarMinWidth =
    SIDEBAR_MIN_WIDTH + (railLayout ? SIDEBAR_RAIL_WIDTH : 0);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readSidebarWidth(
      SIDEBAR_DEFAULT_WIDTH + (railLayout ? SIDEBAR_RAIL_WIDTH : 0),
      sidebarMinWidth,
    ),
  );
  useEffect(() => {
    setSidebarWidth(
      readSidebarWidth(
        SIDEBAR_DEFAULT_WIDTH + (railLayout ? SIDEBAR_RAIL_WIDTH : 0),
        sidebarMinWidth,
      ),
    );
  }, [railLayout, sidebarMinWidth]);
  const [projectExpanded, setProjectExpanded] = useState(() =>
    readWorkspaceExpanded(primaryWorkspaceExpansionId),
  );
  const [showAllProjectSessions, setShowAllProjectSessions] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(
    () => hideProjectHeader || readWorkspaceExpanded('projects'),
  );
  const [collapsedSessionsOpen, setCollapsedSessionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bodyScrolled, setBodyScrolled] = useState(false);
  const [workspaceRenameCandidate, setWorkspaceRenameCandidate] =
    useState<DaemonWorkspaceCapability | null>(null);
  const [workspaceRenameSubmitting, setWorkspaceRenameSubmitting] =
    useState(false);
  const sidebarMountedRef = useRef(false);
  const [workspaceSessionsReloadToken, setWorkspaceSessionsReloadToken] =
    useState(0);
  const [autoExpandWorkspace, setAutoExpandWorkspace] = useState<{
    id: string;
    key: string;
  } | null>(null);
  // Keep the token for WorkspaceSection's group and Git consumers. Session
  // catalogs are invalidated directly through their owning workspace.
  const bumpWorkspaceReload = useCallback(() => {
    setWorkspaceSessionsReloadToken((v) => v + 1);
  }, []);

  useEffect(() => {
    // The five-row preview is scoped per source and per primary workspace;
    // reset the one-shot show-all when either changes, not only on collapse.
    setShowAllProjectSessions(false);
  }, [projectExpanded, primaryWorkspaceExpansionId, selectedSessionSource]);

  const previousPrimaryExpansionIdRef = useRef(primaryWorkspaceExpansionId);
  useEffect(() => {
    const previousId = previousPrimaryExpansionIdRef.current;
    previousPrimaryExpansionIdRef.current = primaryWorkspaceExpansionId;
    if (previousId !== primaryWorkspaceExpansionId) {
      migrateWorkspaceExpansionPreference(
        previousId,
        primaryWorkspaceExpansionId,
      );
    }
    setProjectExpanded(readWorkspaceExpanded(primaryWorkspaceExpansionId));
  }, [primaryWorkspaceExpansionId]);

  useEffect(() => {
    sidebarMountedRef.current = true;
    return () => {
      sidebarMountedRef.current = false;
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    onSearchQueryChange?.(searchQuery);
  }, [onSearchQueryChange, searchQuery]);
  // Order-insensitive membership key: poll-driven catalog updates change
  // it only when the session-id set actually changes, so externally
  // deleted/archived sessions invalidate content-search hits the same way
  // local-handler token bumps do (without re-firing on every poll tick).
  const sessionMembershipKey = useMemo(
    () =>
      sessions
        .map((session) => session.sessionId)
        .sort()
        .join('|'),
    [sessions],
  );
  const contentSearchHits = useSessionContentSearch(
    workspace.client,
    primaryWorkspaceCwd,
    searchQuery,
    `${workspaceSessionsReloadToken}:${sessionMembershipKey}`,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [completedUnreadIds, setCompletedUnreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const sessionMenuPointerDismissRef = useRef(false);
  const sessionMenuOpenRef = useRef(false);
  const renameFocusSuppressRef = useRef(false);
  const handleSessionMenuOpenChange = useCallback((open: boolean) => {
    sessionMenuOpenRef.current = open;
    if (open) renameFocusSuppressRef.current = false;
  }, []);
  const handleSessionMenuPointerDownOutside = useCallback(() => {
    sessionMenuPointerDismissRef.current = true;
  }, []);
  const handleSessionMenuCloseAutoFocus = useCallback((event: Event) => {
    if (renameFocusSuppressRef.current) {
      renameFocusSuppressRef.current = false;
      event.preventDefault();
      return;
    }
    if (!sessionMenuPointerDismissRef.current) return;
    sessionMenuPointerDismissRef.current = false;
    event.preventDefault();
  }, []);
  const isCollapsedCloseBlocked = useCallback(
    () =>
      sessionMenuOpenRef.current ||
      groupMenu !== null ||
      deleteCandidate !== null,
    [deleteCandidate, groupMenu],
  );
  const previousRunningBySourceRef = useRef<
    Record<SidebarSessionSource, Map<string, boolean> | null>
  >({ default: null, channel: null });
  const previousSecondaryRunningBySourceRef = useRef<
    Record<SidebarSessionSource, Map<string, boolean> | null>
  >({ default: null, channel: null });
  const lastTrackedSessionSourceRef = useRef(sessionSource);
  const autoOpenedContextRef = useRef<string | null>(null);
  const resizeTeardownRef = useRef<((updateState: boolean) => void) | null>(
    null,
  );
  const [visibleRecentRows, setVisibleRecentRows] = useState('[]');
  const visibleRecentRowKeys = useMemo<Set<string>>(
    () => new Set(JSON.parse(visibleRecentRows) as string[]),
    [visibleRecentRows],
  );
  const [selectedSessionRow, setSelectedSessionRow] = useState<{
    identity: string;
    recent: boolean;
  } | null>(null);
  const [pendingRecentCreation, setPendingRecentCreation] = useState<{
    previousIdentity: string | null;
  } | null>(null);
  const currentSessionId = connection.sessionId;
  const workspaceRemovalEnabled = Boolean(
    connection.capabilities?.features?.includes('workspace_runtime_removal'),
  );
  const workspaceRenameEnabled = Boolean(
    connection.capabilities?.features?.includes(
      'dynamic_workspace_registration',
    ),
  );
  // Host-local affordance: the daemon opens the folder on ITS host, so the
  // button is only honest when the browser sits on that same machine.
  const localOpenEnabled =
    Boolean(
      connection.capabilities?.features?.includes('workspace_local_open'),
    ) && isLocalDaemon();
  const localTerminalEnabled =
    Boolean(
      connection.capabilities?.features?.includes('workspace_local_terminal'),
    ) && isLocalDaemon();
  const workspaceOverviewEnabled = workspaceOverview !== false;
  const workspaceOverviewItems =
    workspaceOverview === false
      ? DEFAULT_WORKSPACE_OVERVIEW_ITEMS
      : (workspaceOverview?.items ?? DEFAULT_WORKSPACE_OVERVIEW_ITEMS);
  const canExportSessions =
    connection.capabilities?.features?.includes('session_export') ?? false;
  const canExportWorkspaceSessions =
    connection.capabilities?.features?.includes('workspace_session_export') ??
    false;
  const canExportArchivedSessions =
    connection.capabilities?.features?.includes(
      'workspace_archived_session_export',
    ) ?? false;
  const currentSessionIdentity = currentSessionId
    ? getSessionIdentity(
        currentSessionId,
        connection.workspaceCwd || primaryWorkspaceCwd,
      )
    : null;
  const currentRowIdentity =
    currentSessionId && connection.sessionContext?.kind === 'standalone'
      ? JSON.stringify(['standalone', currentSessionId])
      : currentSessionIdentity;
  const activityEnabled = organizationEnabled && !sectionView;
  const [activityOpen, setActivityOpen] = useState(false);
  const activityOperationScope = `${focusedHostOrigin}:${JSON.stringify(liveStateWorkspaceCwds)}`;
  const activityOperations = useActivityOperations(activityOperationScope);
  const [activityPreferences, setActivityPreferences] = useState(
    readActivityPreferences,
  );
  useEffect(() => {
    const update = () => setActivityPreferences(readActivityPreferences());
    window.addEventListener(ACTIVITY_PREFERENCES_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(ACTIVITY_PREFERENCES_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  const activityCurrentKey =
    workspaceSessionActive && currentSessionId
      ? activityKey(
          connection.workspaceCwd || primaryWorkspaceCwd || '',
          currentSessionId,
        )
      : undefined;
  const activity = useActivityCatalog({
    client: workspace.client,
    workspaceCwds: liveStateWorkspaceCwds,
    enabled: activityEnabled,
    open: activityOpen,
    liveStateEnabled: workspaceSessionLiveStateEnabled,
    currentKey: activityCurrentKey,
    onArchivedCurrent: (entry) =>
      onSessionArchived?.(entry.session.sessionId, entry.session.workspaceCwd),
  });
  useEffect(() => {
    setActivityOpen(false);
  }, [workspace.client, lockedWorkspaceCwd, activityEnabled]);
  const toggleActivity = useCallback(() => {
    if (!activityEnabled) return;
    setActivityOpen((value) => !value);
    if (collapsed) onCollapsedChange(false);
    if (homeHidden) onOpenHome?.();
  }, [activityEnabled, collapsed, homeHidden, onCollapsedChange, onOpenHome]);
  useEffect(() => {
    if (!activityEnabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (
        (event.metaKey || event.ctrlKey) &&
        event.altKey &&
        !event.shiftKey &&
        event.code === 'KeyU'
      ) {
        event.preventDefault();
        toggleActivity();
      } else if (event.key === 'Escape' && activityOpen) {
        // A dialog/menu owns its Escape before the sidebar does.
        if (document.querySelector('[role="dialog"], [role="menu"]')) return;
        event.preventDefault();
        setActivityOpen(false);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [activityEnabled, activityOpen, toggleActivity]);
  const sessionTransitioning =
    !connection.error &&
    Boolean(
      connection.loadingTranscript ||
        connection.catchingUp ||
        connection.status === 'connecting',
    );
  useEffect(() => {
    if (connection.loadingTranscript || !currentSessionActive) {
      setPendingRecentCreation(null);
      return;
    }
    if (
      pendingRecentCreation &&
      currentRowIdentity &&
      currentRowIdentity !== pendingRecentCreation.previousIdentity
    ) {
      setSelectedSessionRow({ identity: currentRowIdentity, recent: true });
      setPendingRecentCreation(null);
    }
  }, [
    connection.loadingTranscript,
    currentSessionActive,
    currentRowIdentity,
    pendingRecentCreation,
  ]);
  const liveStateGroupCatalogs = useWorkspaceSessionLiveState(
    workspace.client,
    {
      enabled: workspaceSessionLiveStateEnabled,
      pollIntervalMs: workspace.capabilities?.sessionLiveStatePollIntervalMs,
      workspaceCwds: liveStateWorkspaceCwds,
      groupWorkspaceCwds: liveStateGroupWorkspaceCwds,
    },
  );
  const primaryLiveStateGroupCatalog = primaryWorkspaceCwd
    ? liveStateGroupCatalogs.get(primaryWorkspaceCwd)
    : undefined;
  const secondaryActiveQueries = useMemo<SessionCatalogQuery[]>(
    () =>
      secondaryWorkspaceCwds.map((workspaceCwd) => ({
        routeKind: 'qualified',
        workspaceCwd,
        options: {
          pageSize: SESSION_LIST_PAGE_SIZE,
          archiveState: 'active',
          ...(selectedSessionSource
            ? { sourceType: selectedSessionSource }
            : {}),
          ...(organizationEnabled
            ? { view: 'organized' as const, group: 'all' }
            : {}),
        },
      })),
    [organizationEnabled, secondaryWorkspaceCwds, selectedSessionSource],
  );
  const secondaryStatusQueriesActive =
    sessionCatalogRequestsEnabled &&
    statusSurfaceHidden &&
    !secondaryWorkspaceSessionLiveStateEnabled;
  // Poll cadence follows the previous render's catalog, mirroring the primary
  // catalog: fast while something runs, idle otherwise.
  const [secondaryActiveRunning, setSecondaryActiveRunning] = useState(false);
  const secondaryActiveSnapshots = useSessionCatalogQueries(
    workspace.client,
    secondaryActiveQueries,
    {
      autoLoad: secondaryStatusQueriesActive,
      pollIntervalMs: secondaryStatusQueriesActive
        ? secondaryActiveRunning
          ? ACTIVE_SESSION_POLL_INTERVAL_MS
          : IDLE_SESSION_POLL_INTERVAL_MS
        : undefined,
    },
  );
  const secondaryActiveSessions = useMemo(
    () =>
      secondaryActiveSnapshots.flatMap(
        (snapshot) => snapshot.page?.sessions ?? [],
      ),
    [secondaryActiveSnapshots],
  );
  const secondaryActiveRunningNow = secondaryActiveSessions.some(
    (session) =>
      session.hasActivePrompt || session.activeWorkState === 'active',
  );
  if (secondaryActiveRunningNow !== secondaryActiveRunning) {
    setSecondaryActiveRunning(secondaryActiveRunningNow);
  }
  const secondaryPinnedQueries = useMemo<SessionCatalogQuery[]>(
    () =>
      secondaryWorkspaceCwds.map((workspaceCwd) => ({
        routeKind: 'qualified',
        workspaceCwd,
        options: {
          pageSize: SESSION_LIST_PAGE_SIZE,
          archiveState: 'active',
          ...(selectedSessionSource
            ? { sourceType: selectedSessionSource }
            : {}),
          view: 'organized',
          group: 'pinned',
        },
      })),
    [secondaryWorkspaceCwds, selectedSessionSource],
  );
  const secondaryPinnedSnapshots = useSessionCatalogQueries(
    workspace.client,
    secondaryPinnedQueries,
    {
      autoLoad:
        sessionCatalogRequestsEnabled &&
        !secondaryWorkspaceSessionLiveStateEnabled,
      enabled: organizationEnabled && selectedSessionSource !== 'channel',
    },
  );
  const secondaryPinnedSessions = useMemo(
    () =>
      secondaryPinnedSnapshots.flatMap(
        (snapshot) => snapshot.page?.sessions ?? [],
      ),
    [secondaryPinnedSnapshots],
  );
  // Every catalog page the sidebar renders pin state from. The pin overlay
  // drop check only asks whether a loaded page carries the toggled row —
  // never which page reference a refresh minted — so churn that recreates
  // pages without touching pin state cannot be mistaken for a refresh.
  const pinCatalogPages = useMemo<PinCatalogPage[]>(() => {
    const pages: PinCatalogPage[] = [];
    if (includePrimaryWorkspaceSessions) {
      pages.push(primaryPinnedSessionsPage);
    }
    for (const snapshot of secondaryPinnedSnapshots) {
      pages.push(snapshot.page?.sessions);
    }
    pages.push(sessionsPage);
    for (const snapshot of secondaryActiveSnapshots) {
      pages.push(snapshot.page?.sessions);
    }
    return pages;
  }, [
    includePrimaryWorkspaceSessions,
    primaryPinnedSessionsPage,
    secondaryActiveSnapshots,
    secondaryPinnedSnapshots,
    sessionsPage,
  ]);
  const secondaryArchivedEnabled =
    archivedExpanded &&
    sessionArchiveEnabled &&
    workspaceQualifiedRestCoreEnabled;
  const secondaryArchivedQueries = useMemo<SessionCatalogQuery[]>(
    () =>
      secondaryWorkspaceCwds.map((workspaceCwd) => ({
        routeKind: 'qualified',
        workspaceCwd,
        options: {
          pageSize: SESSION_LIST_PAGE_SIZE,
          archiveState: 'archived',
          ...(archiveSourceType ? { sourceType: archiveSourceType } : {}),
          ...(organizationEnabled
            ? { view: 'organized' as const, group: 'all' }
            : {}),
        },
      })),
    [organizationEnabled, secondaryWorkspaceCwds, archiveSourceType],
  );
  const secondaryArchivedSnapshots = useSessionCatalogQueries(
    workspace.client,
    secondaryArchivedQueries,
    {
      autoLoad:
        sessionCatalogRequestsEnabled &&
        !secondaryWorkspaceSessionLiveStateEnabled,
      enabled: secondaryArchivedEnabled,
    },
  );
  const secondaryArchivedSessions = useMemo(
    () =>
      secondaryArchivedSnapshots.flatMap(
        (snapshot) => snapshot.page?.sessions ?? [],
      ),
    [secondaryArchivedSnapshots],
  );
  const secondaryArchivedLoading = secondaryArchivedSnapshots.some(
    (snapshot) => snapshot.loading,
  );
  const secondaryArchivedError = secondaryArchivedSnapshots.some(
    (snapshot) => snapshot.error !== undefined,
  );
  // Start the fresh read before catalog subscriptions auto-load the same entry.
  useLayoutEffect(() => {
    if (!archivedExpanded || archiveSourceType === 'channel') {
      setStandaloneArchivedStatus((current) =>
        current.count === 0 && !current.loading && !current.error
          ? current
          : { count: 0, loading: false, error: false },
      );
    }
    if (!archivedExpanded) return;
    if (sessionArchiveEnabled) {
      const queries = [
        ...(includePrimaryWorkspaceSessions && archivedCatalogQuery
          ? [archivedCatalogQuery]
          : []),
        ...(workspaceQualifiedRestCoreEnabled ? secondaryArchivedQueries : []),
      ];
      if (queries.length > 0) {
        sessionCatalogController.refreshQueries(queries);
      }
    }
  }, [
    archivedCatalogQuery,
    archivedExpanded,
    archiveSourceType,
    sessionArchiveEnabled,
    includePrimaryWorkspaceSessions,
    secondaryArchivedQueries,
    sessionCatalogController,
    workspaceQualifiedRestCoreEnabled,
  ]);
  const liveWorkspaces = useMemo(
    () => displayedWorkspaces.filter((entry) => entry.kind === 'live'),
    [displayedWorkspaces],
  );
  const projectWorkspaces = useMemo(
    () => displayedWorkspaces.filter((entry) => entry.kind !== 'live'),
    [displayedWorkspaces],
  );
  // Only the rendered list is reordered: the derived cwd lists above feed
  // order-sensitive catalog query keys, so reordering them would re-subscribe
  // every secondary workspace's session catalog.
  const orderedProjectWorkspaces = useMemo(
    () => orderWorkspaces(projectWorkspaces, workspaceOrder),
    [projectWorkspaces, workspaceOrder],
  );
  const moveWorkspaceInList = useCallback(
    (cwd: string, direction: -1 | 1) => {
      const next = moveWorkspace(
        orderedProjectWorkspaces.map((entry) => entry.cwd),
        cwd,
        direction,
      );
      if (!next) return;
      writeWorkspaceOrder(workspaceOrderScope, next);
      setWorkspaceOrder(next);
    },
    [orderedProjectWorkspaces, workspaceOrderScope],
  );
  const resolveSessionWorkspaceScope = useCallback(
    (session: DaemonSessionSummary): SessionWorkspaceScope => {
      const explicitCwd = session.workspaceCwd;
      const cwd = explicitCwd || primaryWorkspaceCwd || '';
      const workspaceEntry = workspaces.find((entry) => entry.cwd === cwd);

      if (explicitCwd && !workspaceEntry) {
        if (!workspaceCatalogAdvertised && cwd === primaryWorkspaceCwd) {
          return { kind: 'primary', cwd };
        }
        return { kind: 'unknown', cwd };
      }
      if (workspaceEntry && !workspaceEntry.trusted) {
        return { kind: 'untrusted', cwd, workspace: workspaceEntry };
      }
      if (
        workspaceEntry?.primary ||
        (!explicitCwd && cwd === primaryWorkspaceCwd)
      ) {
        return { kind: 'primary', cwd };
      }
      if (!workspaceEntry) return { kind: 'unknown', cwd };
      if (lockedWorkspaceCwd === cwd) {
        return { kind: 'locked', cwd, workspace: workspaceEntry };
      }
      return { kind: 'restricted', cwd, workspace: workspaceEntry };
    },
    [
      lockedWorkspaceCwd,
      primaryWorkspaceCwd,
      workspaceCatalogAdvertised,
      workspaces,
    ],
  );
  const getSessionWorkspaceCwd = useCallback(
    (session: DaemonSessionSummary) =>
      resolveSessionWorkspaceScope(session).cwd,
    [resolveSessionWorkspaceScope],
  );
  const isMutableSessionScope = useCallback(
    (scope: SessionWorkspaceScope) =>
      scope.kind === 'primary' || scope.kind === 'locked',
    [],
  );
  const canUseWorkspaceQualifiedActions = useCallback(
    (scope: SessionWorkspaceScope) =>
      scope.kind === 'primary' ||
      ((scope.kind === 'locked' || scope.kind === 'restricted') &&
        workspaceQualifiedRestCoreEnabled),
    [workspaceQualifiedRestCoreEnabled],
  );
  // Organization (pin/group) is safe for any trusted workspace — not just
  // locked ones — because it only mutates display metadata, never executes
  // code or touches the filesystem.
  const canUseOrganizationActions = useCallback(
    (scope: SessionWorkspaceScope) => {
      if (scope.kind === 'unknown' || scope.kind === 'untrusted') return false;
      return scope.kind === 'primary' || workspaceQualifiedRestCoreEnabled;
    },
    [workspaceQualifiedRestCoreEnabled],
  );
  const getSessionWorkspaceActions = useCallback(
    (session: DaemonSessionSummary) => {
      const scope = resolveSessionWorkspaceScope(session);
      if (scope.kind === 'primary') return workspaceActions;
      if (scope.kind === 'locked' || scope.kind === 'restricted') {
        return workspace.client.workspaceByCwd(scope.cwd);
      }
      return undefined;
    },
    [resolveSessionWorkspaceScope, workspace.client, workspaceActions],
  );
  const getIdentityForSession = useCallback(
    (session: DaemonSessionSummary) =>
      getSessionIdentity(session.sessionId, getSessionWorkspaceCwd(session)),
    [getSessionWorkspaceCwd],
  );
  const applyOptimisticPin = useCallback(
    (session: DaemonSessionSummary): DaemonSessionSummary => {
      if (optimisticPins.size === 0) return session;
      const entry = optimisticPins.get(getIdentityForSession(session));
      if (!entry || entry.pinned === (session.isPinned === true)) {
        return session;
      }
      const next: DaemonSessionSummary = {
        ...session,
        isPinned: entry.pinned,
      };
      if (entry.pinned) {
        if (entry.pinnedAt !== undefined) next.pinnedAt = entry.pinnedAt;
      } else {
        delete next.pinnedAt;
      }
      return next;
    },
    [optimisticPins, getIdentityForSession],
  );
  // Drop a settled overlay entry once any loaded page carries its row. The
  // store owns the optimistic pin state in the pages themselves
  // (applySessionPinToggle), so a carried row is correct whether the page
  // holds the store-applied toggle or an authoritative refetch — either way
  // the overlay has nothing left to contribute. Carriage is a pin-state
  // question, and churn (patchSession, live-state ticks) recreates page
  // references without touching pin state, so churn can neither drop an
  // entry early nor strand one: the R5-1 entrances keyed on page-reference
  // freshness no longer exist. An entry whose row no loaded page carries
  // stays until it does (or the RPC fails), rendering the row from its
  // snapshot in the pinned section meanwhile.
  useEffect(() => {
    if (optimisticPins.size === 0) return;
    const staleIdentities: string[] = [];
    for (const [identity, entry] of optimisticPins) {
      if (!entry.rpcSettled) continue;
      const carried = pinCatalogPages.some((page) =>
        page?.some(
          (candidate) => getIdentityForSession(candidate) === identity,
        ),
      );
      if (carried) staleIdentities.push(identity);
    }
    if (staleIdentities.length === 0) return;
    setOptimisticPins((previous) => {
      const next = new Map(previous);
      for (const identity of staleIdentities) next.delete(identity);
      return next;
    });
  }, [getIdentityForSession, optimisticPins, pinCatalogPages]);
  const pinnedSessions = useMemo(() => {
    const byId = new Map<string, DaemonSessionSummary>();
    const addCandidate = (
      session: DaemonSessionSummary,
      options: { requirePinned: boolean },
    ): void => {
      if (!matchesSessionSource(session, selectedSessionSource)) return;
      // Rows fetched through the pinned filter stay unless an optimistic
      // unpin flips them; rows merged from other pages must be pinned.
      if (session.isPinned === false) return;
      if (options.requirePinned && session.isPinned !== true) return;
      byId.set(getIdentityForSession(session), session);
    };
    for (const rawSession of [
      ...(includePrimaryWorkspaceSessions ? primaryPinnedSessions : []),
      ...secondaryPinnedSessions,
    ]) {
      addCandidate(applyOptimisticPin(rawSession), { requirePinned: false });
    }
    // The all-sessions page carries optimistic pins before the pinned page
    // refetch lands.
    for (const rawSession of sessions) {
      addCandidate(applyOptimisticPin(rawSession), { requirePinned: true });
    }
    // A row pinned from a workspace section that no loaded page carries yet
    // renders from its optimistic snapshot so the pin still feels instant.
    for (const [identity, entry] of optimisticPins) {
      if (!entry.pinned || byId.has(identity)) continue;
      addCandidate(applyOptimisticPin(entry.session), { requirePinned: true });
    }
    return [...byId.values()].sort(comparePinnedSectionSessions);
  }, [
    applyOptimisticPin,
    getIdentityForSession,
    includePrimaryWorkspaceSessions,
    optimisticPins,
    primaryPinnedSessions,
    selectedSessionSource,
    secondaryPinnedSessions,
    sessions,
  ]);
  // Identities the Pinned section renders. Pinned rows have exactly one
  // owner: content-search exemptions keep a pinned ghost in the list only
  // when the Pinned section does NOT carry it — otherwise the session
  // renders twice (or, for rename, nowhere that hosts the form).
  const pinnedSectionIdentities = useMemo(
    () =>
      new Set(pinnedSessions.map((session) => getIdentityForSession(session))),
    [getIdentityForSession, pinnedSessions],
  );
  const isCurrentSession = useCallback(
    (session: DaemonSessionSummary) =>
      currentSessionIdentity === getIdentityForSession(session),
    [currentSessionIdentity, getIdentityForSession],
  );
  const activityEntries = useMemo(
    () =>
      activity.entries.map((entry) => ({
        ...entry,
        session: applyOptimisticPin(entry.session),
        unread:
          !isCurrentSession(entry.session) &&
          completedUnreadIds.has(getIdentityForSession(entry.session)),
      })),
    [
      activity.entries,
      applyOptimisticPin,
      completedUnreadIds,
      getIdentityForSession,
      isCurrentSession,
    ],
  );
  const activityIdentities = useMemo(
    () =>
      new Set(
        (activityOpen ? activity.entries : []).map(({ session }) =>
          getIdentityForSession(session),
        ),
      ),
    [activity.entries, activityOpen, getIdentityForSession],
  );
  const markActivityRead = useCallback(
    async (entries: ActivityEntry[]) => {
      setCompletedUnreadIds((current) => {
        const next = new Set(current);
        for (const entry of entries)
          next.delete(getIdentityForSession(entry.session));
        return next.size === current.size ? current : next;
      });
    },
    [getIdentityForSession],
  );
  const previousActivityRunning = useRef<
    | {
        client: typeof workspace.client;
        scope: string;
        running: Map<string, boolean>;
      }
    | undefined
  >(undefined);
  const activityScope = JSON.stringify(liveStateWorkspaceCwds);
  useEffect(() => {
    if (!activityEnabled || !activityOpen) {
      previousActivityRunning.current = undefined;
      return;
    }
    const running = new Map(
      activity.entries.map(({ session }) => [
        getIdentityForSession(session),
        Boolean(session.hasActivePrompt),
      ]),
    );
    const previous = previousActivityRunning.current;
    previousActivityRunning.current = {
      client: workspace.client,
      scope: activityScope,
      running,
    };
    if (
      previous?.client !== workspace.client ||
      previous.scope !== activityScope
    )
      return;
    setCompletedUnreadIds((current) => {
      const next = new Set(current);
      for (const [identity, isRunning] of running) {
        if (isRunning || identity === currentSessionIdentity)
          next.delete(identity);
        else if (previous.running.get(identity) === true) next.add(identity);
      }
      return next.size === current.size &&
        [...next].every((id) => current.has(id))
        ? current
        : next;
    });
  }, [
    activity.entries,
    activityEnabled,
    activityOpen,
    activityScope,
    currentSessionIdentity,
    getIdentityForSession,
    workspace.client,
  ]);
  const canRenameSession = useCallback(
    (session: DaemonSessionSummary) => {
      if (!sessionActionItems.has('rename')) return false;
      const scope = resolveSessionWorkspaceScope(session);
      if (isCurrentSession(session) && isMutableSessionScope(scope)) {
        return true;
      }
      return (
        workspaceSessionMetadataEnabled &&
        canUseWorkspaceQualifiedActions(scope)
      );
    },
    [
      canUseWorkspaceQualifiedActions,
      isCurrentSession,
      isMutableSessionScope,
      resolveSessionWorkspaceScope,
      sessionActionItems,
      workspaceSessionMetadataEnabled,
    ],
  );
  const canShowDeleteSession = useCallback(
    (session: DaemonSessionSummary) =>
      session.sourceType !== 'qwen-live' &&
      sessionActionItems.has('delete') &&
      canUseWorkspaceQualifiedActions(resolveSessionWorkspaceScope(session)),
    [
      canUseWorkspaceQualifiedActions,
      resolveSessionWorkspaceScope,
      sessionActionItems,
    ],
  );
  const canDeleteSession = useCallback(
    (session: DaemonSessionSummary) =>
      // The current session is deletable too (issue #12619), but deleting the
      // session the client is attached to tears its runtime down — match the
      // Session Overview's idle-only policy for that case.
      (!isCurrentSession(session) ||
        (!session.hasActivePrompt && session.activeWorkState !== 'active')) &&
      canShowDeleteSession(session),
    [canShowDeleteSession, isCurrentSession],
  );
  const canOrganizeSession = useCallback(
    (session: DaemonSessionSummary, item: 'pin' | 'group') =>
      organizationEnabled &&
      sessionActionItems.has(item) &&
      canUseOrganizationActions(resolveSessionWorkspaceScope(session)),
    [
      canUseOrganizationActions,
      organizationEnabled,
      resolveSessionWorkspaceScope,
      sessionActionItems,
    ],
  );
  const resolveWorkspaceScope = useCallback(
    (workspaceCwd?: string) =>
      resolveSessionWorkspaceScope({
        sessionId: '',
        workspaceCwd,
      } as DaemonSessionSummary),
    [resolveSessionWorkspaceScope],
  );
  const canOrganizeWorkspace = useCallback(
    (workspaceCwd?: string) =>
      organizationEnabled &&
      sessionActionItems.has('group') &&
      canUseOrganizationActions(resolveWorkspaceScope(workspaceCwd)),
    [
      canUseOrganizationActions,
      organizationEnabled,
      resolveWorkspaceScope,
      sessionActionItems,
    ],
  );
  const groupAssignmentPolicyRef = useRef<{
    canOrganizeSession: typeof canOrganizeSession;
    getSessionWorkspaceActions: typeof getSessionWorkspaceActions;
    resolveWorkspaceScope: typeof resolveWorkspaceScope;
  } | null>(null);
  groupAssignmentPolicyRef.current = {
    canOrganizeSession,
    getSessionWorkspaceActions,
    resolveWorkspaceScope,
  };
  const canMutateSessionArchive = useCallback(
    (session: DaemonSessionSummary) => {
      const scope = resolveSessionWorkspaceScope(session);
      if (scope.kind === 'unknown' || scope.kind === 'untrusted') return false;
      return (
        sessionArchiveEnabled &&
        (scope.kind === 'primary' || workspaceQualifiedRestCoreEnabled)
      );
    },
    [
      resolveSessionWorkspaceScope,
      sessionArchiveEnabled,
      workspaceQualifiedRestCoreEnabled,
    ],
  );
  const getActiveExportScope = useCallback(
    (session: DaemonSessionSummary) => {
      const scope = resolveSessionWorkspaceScope(session);
      if (scope.kind === 'primary' && canExportSessions) {
        return scope;
      }
      if (scope.kind === 'locked' && canExportWorkspaceSessions) {
        return scope;
      }
      return undefined;
    },
    [
      canExportSessions,
      canExportWorkspaceSessions,
      resolveSessionWorkspaceScope,
    ],
  );
  const getArchivedExportWorkspaceCwd = useCallback(
    (session: DaemonSessionSummary) => {
      const scope = resolveSessionWorkspaceScope(session);
      return canExportArchivedSessions &&
        scope.kind !== 'unknown' &&
        scope.kind !== 'untrusted'
        ? scope.cwd
        : undefined;
    },
    [canExportArchivedSessions, resolveSessionWorkspaceScope],
  );
  const canArchiveSession = useCallback(
    (session: DaemonSessionSummary) =>
      session.sourceType !== 'qwen-live' &&
      sessionActionItems.has('archive') &&
      !isCurrentSession(session) &&
      !session.hasActivePrompt &&
      session.activeWorkState !== 'active' &&
      canMutateSessionArchive(session),
    [canMutateSessionArchive, isCurrentSession, sessionActionItems],
  );
  const canUnarchiveSession = useCallback(
    (session: DaemonSessionSummary) =>
      sessionActionItems.has('archive') && canMutateSessionArchive(session),
    [canMutateSessionArchive, sessionActionItems],
  );

  const allArchivedSessions = useMemo(() => {
    const byIdentity = new Map<string, DaemonSessionSummary>();
    for (const session of [
      ...(includePrimaryWorkspaceSessions ? archivedSessions : []),
      ...secondaryArchivedSessions,
    ]) {
      if (!matchesSessionSource(session, archiveSourceType)) continue;
      byIdentity.set(getIdentityForSession(session), session);
    }
    return [...byIdentity.values()];
  }, [
    archivedSessions,
    getIdentityForSession,
    includePrimaryWorkspaceSessions,
    archiveSourceType,
    secondaryArchivedSessions,
  ]);
  const effectiveArchivedLoading =
    (includePrimaryWorkspaceSessions && archivedLoading) ||
    secondaryArchivedLoading;
  const effectiveArchivedError =
    (includePrimaryWorkspaceSessions && Boolean(archivedError)) ||
    secondaryArchivedError;

  const qwenCodeVersion = connection.capabilities?.qwenCodeVersion || '';
  // Numeric releases render as "v1.2.3"; a non-semver fallback such as
  // "unknown" is shown as-is so we never produce a bogus "vunknown".
  const versionLabel = qwenCodeVersion
    ? /^\d/.test(qwenCodeVersion)
      ? `v${qwenCodeVersion}`
      : qwenCodeVersion
    : '';
  // Keep action buttons compact; the version and update share a separate row.
  const footerCompact =
    !collapsed && sidebarWidth < SIDEBAR_FOOTER_COMPACT_WIDTH;
  const sidebarStyle = {
    '--web-shell-sidebar-width': `${sidebarWidth}px`,
    ...(containerWidth
      ? { '--web-shell-sidebar-container-width': `${containerWidth}px` }
      : {}),
    '--web-shell-sidebar-min-width': `${sidebarMinWidth}px`,
    '--web-shell-sidebar-max-width': `${getSidebarMaxWidth()}px`,
  } as CSSProperties;
  const newSessionDisabled = creatingSession;

  useEffect(() => {
    if (!currentSessionId) return;
    const activeWorkspace =
      displayedWorkspaces.find(
        (entry) => entry.cwd === connection.workspaceCwd,
      ) ??
      (displayedWorkspaces.length === 1 && displayedWorkspaces[0]?.primary
        ? displayedWorkspaces[0]
        : undefined);
    if (!activeWorkspace) return;
    const contextKey = `session:${currentSessionId}:${activeWorkspace.id}`;
    if (autoOpenedContextRef.current === contextKey) return;
    autoOpenedContextRef.current = contextKey;
    if (!hasWorkspaceExpansionPreference('projects')) {
      setProjectsExpanded(true);
    }
    if (activeWorkspace.primary) {
      if (!hasWorkspaceExpansionPreference(primaryWorkspaceExpansionId)) {
        setProjectExpanded(true);
      }
    } else if (!hasWorkspaceExpansionPreference(activeWorkspace.id)) {
      setAutoExpandWorkspace({ id: activeWorkspace.id, key: contextKey });
    }
  }, [
    connection.workspaceCwd,
    currentSessionId,
    displayedWorkspaces,
    primaryWorkspaceExpansionId,
  ]);

  useEffect(() => {
    if (currentSessionId || selectedWorkspaceCwd !== undefined) {
      return;
    }
    if (!workspace.capabilities) return;
    const connectedWorkspace = workspaces.find(
      (entry) => entry.cwd === connection.workspaceCwd,
    );
    const contextKey = `new:${connectedWorkspace?.id ?? 'primary'}`;
    if (autoOpenedContextRef.current === contextKey) return;
    autoOpenedContextRef.current = contextKey;
    if (!hasWorkspaceExpansionPreference('projects')) {
      setProjectsExpanded(true);
    }
    if (connectedWorkspace && !connectedWorkspace.primary) {
      if (!hasWorkspaceExpansionPreference(connectedWorkspace.id)) {
        setAutoExpandWorkspace({
          id: connectedWorkspace.id,
          key: contextKey,
        });
      }
      onSelectWorkspace?.(connectedWorkspace.cwd);
      return;
    }
    if (!hasWorkspaceExpansionPreference(primaryWorkspaceExpansionId)) {
      setProjectExpanded(true);
    }
  }, [
    connection.workspaceCwd,
    currentSessionId,
    onSelectWorkspace,
    primaryWorkspaceExpansionId,
    selectedWorkspaceCwd,
    workspace.capabilities,
    workspaces,
  ]);

  const setSessionBusy = useCallback(
    (sessionId: string, busy: boolean, workspaceCwd?: string) => {
      const identity = getSessionIdentity(
        sessionId,
        workspaceCwd || primaryWorkspaceCwd,
      );
      const next = new Set(busySessionIdsRef.current);
      if (busy) {
        next.add(identity);
      } else {
        next.delete(identity);
      }
      busySessionIdsRef.current = next;
      setBusySessionIds(next);
    },
    [primaryWorkspaceCwd],
  );

  const reloadGroups = useCallback(async () => {
    if (!organizationEnabled || channelGroupingEnabled) {
      setGroups([]);
      setMenuGroups([]);
      setColorOptions([]);
      setGroupsCatalogReady(true);
      return;
    }
    if (primaryWorkspaceLiveStateGroupsEnabled) return;
    try {
      const catalog = await workspaceActions.listSessionGroups();
      setGroups(catalog.groups);
      setMenuGroups(catalog.groups);
      setColorOptions(catalog.colorOptions);
      // Empty catalogs still settle the latch — sessions/groups hydrate on
      // independent requests, so readiness cannot wait for a non-empty list.
      // Failures must not settle it (see sessionsCatalogReady above).
      setGroupsCatalogReady(true);
    } catch (err) {
      onError(err, t('sidebar.groupsLoadFailed'));
    }
  }, [
    channelGroupingEnabled,
    onError,
    organizationEnabled,
    primaryWorkspaceLiveStateGroupsEnabled,
    t,
    workspaceActions,
  ]);

  useEffect(() => {
    if (!organizationEnabled || channelGroupingEnabled) {
      setGroups([]);
      setMenuGroups([]);
      setColorOptions([]);
      setGroupsCatalogReady(true);
      return;
    }
    if (!includePrimaryWorkspaceSessions) {
      setGroups([]);
      setMenuGroups([]);
      setColorOptions([]);
      setGroupsCatalogReady(true);
      return;
    }
    if (primaryWorkspaceLiveStateGroupsEnabled) {
      setGroupsCatalogReady(false);
      if (!primaryLiveStateGroupCatalog) return;
      setGroups(primaryLiveStateGroupCatalog.groups);
      // The open group menu may be anchored to a session from a different
      // workspace (openGroupMenuFromAnchor loads menuGroups from the
      // session's own workspace) — don't clobber it with the primary
      // workspace's catalog on every reconcile.
      if (!groupMenuOpenRef.current) {
        setMenuGroups(primaryLiveStateGroupCatalog.groups);
        setColorOptions(primaryLiveStateGroupCatalog.colorOptions);
      }
      setGroupsCatalogReady(true);
      return;
    }
    setGroupsCatalogReady(false);
    void reloadGroups();
  }, [
    includePrimaryWorkspaceSessions,
    channelGroupingEnabled,
    organizationEnabled,
    primaryLiveStateGroupCatalog,
    reloadGroups,
    primaryWorkspaceLiveStateGroupsEnabled,
  ]);

  useEffect(() => {
    if (!groupMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (groupMenuRef.current?.contains(event.target as Node)) return;
      setGroupMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGroupMenu(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [groupMenu]);

  useEffect(() => {
    if (!groupMenu) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const items = Array.from(
        groupMenuRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        ) ?? [],
      );
      const selected =
        items.find((item) => item.getAttribute('aria-checked') === 'true') ??
        items[0];
      selected?.focus();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [groupMenu]);

  const handleGroupMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const items = Array.from(
        groupMenuRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        ) ?? [],
      );
      if (items.length === 0) return;
      const activeIndex = items.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const currentIndex = activeIndex >= 0 ? activeIndex : -1;
      let nextIndex: number | undefined;
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setGroupMenu(null);
        return;
      }
      if (nextIndex === undefined) return;
      event.preventDefault();
      items[nextIndex]?.focus();
    },
    [],
  );

  useEffect(
    () => () => {
      resizeTeardownRef.current?.(false);
    },
    [],
  );

  // The max width derives from window size, so re-clamp when the window
  // shrinks below a previously stored wider sidebar.
  useEffect(() => {
    function handleWindowResize() {
      setSidebarWidth((current) => clampSidebarWidth(current, sidebarMinWidth));
    }
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [sidebarMinWidth]);

  const hasRunningSession = useMemo(
    () =>
      sessions.some(
        (session) =>
          session.hasActivePrompt || session.activeWorkState === 'active',
      ),
    [sessions],
  );
  const statusSessions = useMemo(() => {
    const byIdentity = new Map<string, DaemonSessionSummary>();
    // Secondary status is loaded and polled only while the status surface
    // is hidden; with the Home column visible the retained catalog page
    // stops refreshing. Folding it in here would paint approvals/questions
    // the daemon may already have resolved, on both rail render sites at
    // once (the dot and the accessible name). Only a contribution that is
    // actively refreshed may certify. On live-state daemons the secondary
    // catalog path is unloaded regardless, so nothing fresh is hidden.
    const eligibleSecondarySessions = secondaryStatusQueriesActive
      ? secondaryActiveSessions
      : [];
    for (const session of [...sessions, ...eligibleSecondarySessions]) {
      byIdentity.set(getIdentityForSession(session), session);
    }
    if (activityEnabled && activityOpen) {
      for (const entry of activity.entries) {
        byIdentity.set(getIdentityForSession(entry.session), entry.session);
      }
    }
    return [...byIdentity.values()];
  }, [
    getIdentityForSession,
    secondaryActiveSessions,
    secondaryStatusQueriesActive,
    sessions,
    activityEnabled,
    activityOpen,
    activity.entries,
  ]);
  const collapsedSessionStatus = useMemo(() => {
    if (statusSessions.some((session) => session.isWaitingForPermission)) {
      return 'approval' as const;
    }
    if (statusSessions.some((session) => session.isWaitingForUserQuestion)) {
      return 'question' as const;
    }
    if (
      statusSessions.some((session) =>
        completedUnreadIds.has(getIdentityForSession(session)),
      )
    ) {
      return 'completed' as const;
    }
    return undefined;
  }, [completedUnreadIds, getIdentityForSession, statusSessions]);
  const collapsedSessionStatusLabel = collapsedSessionStatus
    ? t(
        collapsedSessionStatus === 'approval'
          ? 'sidebar.waitingForApproval'
          : collapsedSessionStatus === 'question'
            ? 'sidebar.userInputNeeded'
            : 'sidebar.completedUnread',
      )
    : undefined;
  const sessionPollInterval =
    projectExpanded || hasRunningSession || selectedSessionSource === 'channel'
      ? (hasRunningSession || selectedSessionSource === 'channel') && !error
        ? ACTIVE_SESSION_POLL_INTERVAL_MS
        : IDLE_SESSION_POLL_INTERVAL_MS
      : undefined;
  useSessionCatalogPolling(
    workspace.client,
    includePrimaryWorkspaceSessions ? catalogQuery : undefined,
    sessionCatalogRequestsEnabled && !primaryWorkspaceSessionLiveStateEnabled
      ? sessionPollInterval
      : undefined,
  );
  // Channel grouping rides the session poll cadence: instances added or
  // removed while the channel source is active must reach the grouping logic
  // without a source switch.
  const channelCatalogPollInFlightRef = useRef(false);
  useEffect(() => {
    if (!daemonAvailable || !channelGroupingEnabled) return;
    // Back off on the channels hook's OWN failures too — a persistently
    // failing channels endpoint must not be re-requested every 2s.
    const pollInterval =
      !error && !channelCatalogError
        ? ACTIVE_SESSION_POLL_INTERVAL_MS
        : IDLE_SESSION_POLL_INTERVAL_MS;
    const intervalId = window.setInterval(() => {
      if (document.hidden || channelCatalogPollInFlightRef.current) return;
      channelCatalogPollInFlightRef.current = true;
      void reloadChannelCatalog().finally(() => {
        channelCatalogPollInFlightRef.current = false;
      });
    }, pollInterval);
    return () => window.clearInterval(intervalId);
  }, [
    daemonAvailable,
    channelCatalogError,
    channelGroupingEnabled,
    error,
    reloadChannelCatalog,
  ]);

  useEffect(() => {
    if (lastTrackedSessionSourceRef.current !== sessionSource) {
      lastTrackedSessionSourceRef.current = sessionSource;
      return;
    }
    if (loading || error) return;

    const runningBySessionId = new Map(
      sessions
        .filter(
          (session) =>
            matchesSessionSource(session, selectedSessionSource) &&
            !activityIdentities.has(getIdentityForSession(session)),
        )
        .map((session) => [
          getIdentityForSession(session),
          Boolean(session.hasActivePrompt),
        ]),
    );
    const previousRunningBySessionId =
      previousRunningBySourceRef.current[sessionSource];
    previousRunningBySourceRef.current[sessionSource] = runningBySessionId;
    if (previousRunningBySessionId === null) return;

    setCompletedUnreadIds((current) => {
      const next = new Set(current);
      let changed = false;

      for (const [sessionIdentity, wasRunning] of previousRunningBySessionId) {
        const isRunning = runningBySessionId.get(sessionIdentity);
        if (
          wasRunning &&
          isRunning === false &&
          sessionIdentity !== currentSessionIdentity &&
          !next.has(sessionIdentity)
        ) {
          next.add(sessionIdentity);
          changed = true;
        }
      }

      for (const sessionIdentity of next) {
        if (activityIdentities.has(sessionIdentity)) continue;
        if (
          sessionIdentity === currentSessionIdentity ||
          (previousRunningBySessionId.has(sessionIdentity) &&
            (!runningBySessionId.has(sessionIdentity) ||
              runningBySessionId.get(sessionIdentity)))
        ) {
          next.delete(sessionIdentity);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [
    currentSessionIdentity,
    activityIdentities,
    error,
    getIdentityForSession,
    loading,
    selectedSessionSource,
    sessionSource,
    sessions,
  ]);

  // A page the store kept from before the visible window is not refetched
  // on re-subscription, so it must never become the tracker baseline: the
  // diff below would measure completions against pre-visible rows and
  // repaint a watched completion as unread on the next poll.
  const hiddenSinceRef = useRef(0);
  const previousStatusSurfaceHiddenRef = useRef(statusSurfaceHidden);
  if (statusSurfaceHidden && !previousStatusSurfaceHiddenRef.current) {
    hiddenSinceRef.current = Date.now();
  }
  previousStatusSurfaceHiddenRef.current = statusSurfaceHidden;

  useEffect(() => {
    if (!statusSurfaceHidden) {
      // The secondary queries only run while the surface is hidden, so the
      // baseline would otherwise freeze at its last hidden snapshot: a
      // completion the user watched while the Home column is visible would be
      // compared against that frozen running snapshot on the next hidden
      // cycle and repainted as an unread completion. Nulling the baseline
      // makes the first hidden cycle after a visible period baseline-only.
      previousSecondaryRunningBySourceRef.current[sessionSource] = null;
      return;
    }
    if (
      secondaryActiveSnapshots.length !== secondaryActiveQueries.length ||
      secondaryActiveSnapshots.some((snapshot) => {
        if (snapshot.loading || snapshot.error) return true;
        // An unstamped or pre-hidden snapshot is not fresh yet: the store's
        // retained page skips refetch on re-subscription, and the first new
        // data only arrives with the armed poll.
        return (snapshot.updatedAt ?? 0) < hiddenSinceRef.current;
      })
    ) {
      return;
    }
    const runningBySessionId = new Map(
      secondaryActiveSessions
        .filter(
          (session) =>
            matchesSessionSource(session, selectedSessionSource) &&
            !activityIdentities.has(getIdentityForSession(session)),
        )
        .map((session) => [
          getIdentityForSession(session),
          Boolean(session.hasActivePrompt),
        ]),
    );
    const previousRunningBySessionId =
      previousSecondaryRunningBySourceRef.current[sessionSource];
    previousSecondaryRunningBySourceRef.current[sessionSource] =
      runningBySessionId;
    if (previousRunningBySessionId === null) return;

    setCompletedUnreadIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const [sessionIdentity, wasRunning] of previousRunningBySessionId) {
        if (activityIdentities.has(sessionIdentity)) continue;
        const isRunning = runningBySessionId.get(sessionIdentity);
        if (
          wasRunning &&
          isRunning === false &&
          sessionIdentity !== currentSessionIdentity &&
          !next.has(sessionIdentity)
        ) {
          next.add(sessionIdentity);
          changed = true;
        } else if (
          next.has(sessionIdentity) &&
          (sessionIdentity === currentSessionIdentity ||
            !runningBySessionId.has(sessionIdentity) ||
            isRunning)
        ) {
          next.delete(sessionIdentity);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [
    statusSurfaceHidden,
    activityIdentities,
    currentSessionIdentity,
    getIdentityForSession,
    secondaryActiveQueries.length,
    secondaryActiveSessions,
    secondaryActiveSnapshots,
    selectedSessionSource,
    sessionSource,
  ]);

  const reconcileRemovedWorkspace = useCallback(
    async (removed: DaemonWorkspaceCapability) => {
      if (!sidebarMountedRef.current) return;
      if (selectedWorkspaceCwd === removed.cwd) {
        onSelectWorkspace?.(undefined);
      }
      sessionCatalogController.invalidateWorkspace(removed.cwd);
      setWorkspaceSessionsReloadToken((token) => token + 1);
      try {
        await workspace.refreshCapabilities?.();
      } catch {
        // The mutation already converged; a later refresh will reconcile.
      }
      if (!sidebarMountedRef.current) return;
      void reload().catch(() => undefined);
      void reloadArchived().catch(() => undefined);
    },
    [
      onSelectWorkspace,
      reload,
      reloadArchived,
      selectedWorkspaceCwd,
      sessionCatalogController,
      workspace,
    ],
  );

  const workspaceRemoval = useWorkspaceRemoval({
    removeWorkspace: (workspaceId, options) =>
      workspaceActions.removeWorkspace(workspaceId, options),
    onRemoved: reconcileRemovedWorkspace,
    onError,
    errorMessage: t('sidebar.removeWorkspaceError'),
    // The forced retry cannot target the workspace the active session lives
    // in; the dialog explains and disables it, the hook enforces it against
    // a stale click.
    blockForce: (candidate) =>
      Boolean(connection.sessionId) &&
      connection.workspaceCwd === candidate.cwd,
  });

  const requestWorkspaceRename = useCallback(
    (candidate: DaemonWorkspaceCapability) => {
      if (workspaceRenameSubmitting) return;
      setWorkspaceRenameCandidate(candidate);
    },
    [workspaceRenameSubmitting],
  );

  const confirmWorkspaceRename = useCallback(
    async (displayName: string | null) => {
      const candidate = workspaceRenameCandidate;
      if (!candidate || workspaceRenameSubmitting) return;
      setWorkspaceRenameSubmitting(true);
      try {
        await workspaceActions.updateWorkspace(candidate.id, { displayName });
        setWorkspaceRenameCandidate(null);
      } catch (error) {
        onError(error, t('sidebar.renameWorkspaceFailed'));
        return;
      } finally {
        setWorkspaceRenameSubmitting(false);
      }
      // The row label reads the capabilities list; refresh so the new name
      // shows without waiting for the next connection tick. The rename has
      // already converged, so a failed refresh is not a rename failure — a
      // later poll tick reconciles the label.
      try {
        await workspace.refreshCapabilities?.();
      } catch {
        // Reconciled by the next capabilities refresh.
      }
    },
    [
      onError,
      t,
      workspace,
      workspaceActions,
      workspaceRenameCandidate,
      workspaceRenameSubmitting,
    ],
  );

  const copyWorkspacePath = useCallback(
    (candidate: DaemonWorkspaceCapability) => {
      void writeClipboardText(candidate.ssh?.directory ?? candidate.cwd).catch(
        (error: unknown) => {
          onError(error, t('sidebar.copyWorkspacePathFailed'));
        },
      );
    },
    [onError, t],
  );

  const openWorkspaceFolderLocally = useCallback(
    async (cwd: string): Promise<void> => {
      try {
        await workspace.client.workspaceByCwd(cwd).openLocally();
      } catch (error) {
        onError(error, t('sidebar.openWorkspaceFolderFailed'));
        // Rethrow so the hover popover keeps its idle icon on a failure the
        // toast already reported.
        throw error;
      }
    },
    [onError, t, workspace.client],
  );

  const openWorkspaceTerminalLocally = useCallback(
    async (cwd: string): Promise<void> => {
      try {
        await workspace.client.workspaceByCwd(cwd).openTerminalLocally();
      } catch (error) {
        onError(error, t('sidebar.openWorkspaceTerminalFailed'));
        throw error;
      }
    },
    [onError, t, workspace.client],
  );

  const reloadWorkspaceRuntime = useCallback(
    (candidate: DaemonWorkspaceCapability) => {
      // Deferred so a client without the reload method (older SDK) reports
      // through onError instead of throwing out of the menu handler.
      void Promise.resolve()
        .then(() => workspace.client.workspaceByCwd(candidate.cwd).reload())
        .then(() => {
          // A reload re-reads settings and may restart the child; refetch the
          // per-workspace lists and chips instead of waiting a poll interval.
          setWorkspaceSessionsReloadToken((token) => token + 1);
        })
        .catch((error: unknown) => {
          onError(error, t('sidebar.reloadWorkspaceFailed'));
        });
    },
    [onError, t, workspace.client],
  );

  const handleNewSession = useCallback(
    (workspaceCwd?: string, fromRecent = false) => {
      if (creatingSessionRef.current) return;

      creatingSessionRef.current = true;
      setCreatingSession(true);
      setPendingRecentCreation(
        fromRecent ? { previousIdentity: currentRowIdentity } : null,
      );
      void (async () => {
        try {
          const created = await onNewSession(workspaceCwd);
          if (!created) setPendingRecentCreation(null);
          if (created && sessionContent === undefined) {
            bumpWorkspaceReload();
            const ownerCwd = workspaceCwd ?? primaryWorkspaceCwd;
            if (ownerCwd) {
              sessionCatalogController.refreshWorkspace(ownerCwd);
            }
          }
        } catch (err) {
          setPendingRecentCreation(null);
          if (!isAbortError(err)) {
            onError(err, t('sidebar.newSessionFailed'));
          }
        } finally {
          creatingSessionRef.current = false;
          setCreatingSession(false);
        }
      })();
    },
    [
      bumpWorkspaceReload,
      currentRowIdentity,
      onError,
      onNewSession,
      primaryWorkspaceCwd,
      sessionCatalogController,
      sessionContent,
      t,
    ],
  );

  // Same re-entrancy guard, busy state and catalog invalidation as a plain
  // new task; only the creation callback differs.
  const handleNewWorktreeSession = useCallback(
    (workspaceCwd?: string) => {
      if (!onNewWorktreeSession || creatingSessionRef.current) return;

      creatingSessionRef.current = true;
      setCreatingSession(true);
      void (async () => {
        try {
          const created = await onNewWorktreeSession(workspaceCwd);
          if (created) {
            bumpWorkspaceReload();
            const ownerCwd = workspaceCwd ?? primaryWorkspaceCwd;
            if (ownerCwd) {
              sessionCatalogController.refreshWorkspace(ownerCwd);
            }
          }
        } catch (err) {
          if (!isAbortError(err)) {
            onError(err, t('sidebar.newSessionFailed'));
          }
        } finally {
          creatingSessionRef.current = false;
          setCreatingSession(false);
        }
      })();
    },
    [
      bumpWorkspaceReload,
      onError,
      onNewWorktreeSession,
      primaryWorkspaceCwd,
      sessionCatalogController,
      t,
    ],
  );

  const handleLoadSession = useCallback(
    (sessionId: string, workspaceCwd?: string) => {
      const sessionIdentity = getSessionIdentity(
        sessionId,
        workspaceCwd || primaryWorkspaceCwd,
      );
      if (sessionIdentity === currentSessionIdentity) {
        onSelectCurrentSession?.();
        return;
      }
      if (busySessionIdsRef.current.has(sessionIdentity)) return;
      setCompletedUnreadIds((current) => {
        if (!current.has(sessionIdentity)) return current;
        const next = new Set(current);
        next.delete(sessionIdentity);
        return next;
      });
      setSessionBusy(sessionId, true, workspaceCwd);
      void (async () => {
        try {
          await onLoadSession(sessionId, workspaceCwd);
        } catch (err) {
          if (!isAbortError(err)) {
            onError(err, t('sidebar.switchFailed'));
          }
        } finally {
          setSessionBusy(sessionId, false, workspaceCwd);
        }
      })();
    },
    [
      currentSessionIdentity,
      onError,
      onLoadSession,
      onSelectCurrentSession,
      primaryWorkspaceCwd,
      setSessionBusy,
      t,
    ],
  );

  const livePendingContent = livePresence ? (
    <>
      <LoaderCircleIcon aria-hidden="true" />
      <span>{t('sidebar.liveVoicePending')}</span>
    </>
  ) : null;
  const liveCoordinator = livePresence?.coordinator;
  const livePendingRow = liveCoordinator ? (
    <button
      type="button"
      className={styles.livePendingSession}
      data-live-pending-session
      onClick={() =>
        handleLoadSession(
          liveCoordinator.sessionId,
          liveCoordinator.workspaceCwd,
        )
      }
    >
      {livePendingContent}
    </button>
  ) : livePresence ? (
    <div
      className={styles.livePendingSession}
      role="status"
      data-live-pending-session
    >
      {livePendingContent}
    </div>
  ) : null;

  const startRename = useCallback(
    (session: DaemonSessionSummary) => {
      if (!canRenameSession(session)) return;
      const identity = getIdentityForSession(session);
      if (busySessionIdsRef.current.has(identity)) return;
      renameDraftsRef.current.clear();
      setEditingSession(session);
      setEditingSessionIdentity(identity);
      editingSessionIdentityRef.current = identity;
    },
    [canRenameSession, getIdentityForSession],
  );

  const cancelRename = useCallback(() => {
    const identity = editingSessionIdentityRef.current;
    if (identity !== null) renameDraftsRef.current.delete(identity);
    setEditingSession(null);
    setEditingSessionIdentity(null);
    editingSessionIdentityRef.current = null;
  }, []);
  useEffect(() => {
    if (editingSession && !canRenameSession(editingSession)) {
      cancelRename();
    }
  }, [canRenameSession, cancelRename, editingSession]);

  useEffect(() => {
    if (railLayout) {
      if (homeHidden && !homePreviewOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setCollapsedSessionsOpen(false);
        cancelRename();
        setGroupMenu(null);
      }
      // The Live section unmounts the search field (the !liveView gate on
      // it). Resetting here keeps a surviving searchOpen from remounting an
      // autoFocus input on the way back and stealing focus. The Channels
      // section keeps the field mounted, so its search stays open.
      if (liveView) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      return;
    }
    if (!collapsed) {
      setCollapsedSessionsOpen(false);
      setSearchOpen(false);
      setSearchQuery('');
      cancelRename();
      setGroupMenu(null);
    } else if (!collapsedSessionsOpen) {
      // A stale open search or rename editor would otherwise mount its
      // autofocused input inside the collapsed hover popover and steal
      // focus from the composer on every hover-open, so reset it whenever
      // the collapsed surface is not showing (sidebar collapse, hover-out,
      // or dismissal). Radix's outside-interaction
      // dismissal unmounts a focused input without firing blur. A stale
      // group picker would likewise block dismissal of the next
      // hover-opened switcher.
      setSearchOpen(false);
      setSearchQuery('');
      cancelRename();
      setGroupMenu(null);
    }
  }, [
    cancelRename,
    collapsed,
    collapsedSessionsOpen,
    railLayout,
    homeHidden,
    homePreviewOpen,
    liveView,
  ]);

  useEffect(() => {
    if (projectFeaturesEnabled) return;
    setCollapsedSessionsOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    cancelRename();
    setGroupMenu(null);
  }, [cancelRename, projectFeaturesEnabled]);

  const saveRename = useCallback(
    (displayName: string) => {
      const nextName = displayName.trim();
      if (
        !nextName ||
        !editingSession ||
        editingSessionIdentity !== getIdentityForSession(editingSession) ||
        !canRenameSession(editingSession)
      ) {
        cancelRename();
        return;
      }
      const sessionId = editingSession.sessionId;
      const workspaceCwd = getSessionWorkspaceCwd(editingSession);
      const sessionIdentity = getIdentityForSession(editingSession);
      if (busySessionIdsRef.current.has(sessionIdentity)) {
        return;
      }
      setSessionBusy(sessionId, true, workspaceCwd);
      // Close the editor before the round trip: the draft is committed, and
      // holding the form open until the daemon answers reads as a stall.
      if (editingSessionIdentityRef.current === sessionIdentity) {
        cancelRename();
      }
      let renamed = false;
      const rename = isCurrentSession(editingSession)
        ? actions.renameSession(nextName)
        : workspaceCwd
          ? workspace.client
              .workspaceByCwd(workspaceCwd)
              .updateSessionMetadata(sessionId, { displayName: nextName })
          : workspace.client.updateSessionMetadata(sessionId, {
              displayName: nextName,
            });
      rename
        .then((result: SessionMetadataResult | void) => {
          renamed = true;
          // The daemon clamps displayName to 256 chars and reports the stored
          // value; propagate that instead of the locally typed string so the
          // catalog cache never disagrees with the daemon.
          const effectiveName =
            typeof result?.displayName === 'string' && result.displayName
              ? result.displayName
              : nextName;
          if (workspaceCwd) {
            if (onSessionRenameConfirmed) {
              onSessionRenameConfirmed(workspaceCwd, sessionId, effectiveName);
            } else {
              sessionCatalogController.renamed(
                workspaceCwd,
                sessionId,
                effectiveName,
              );
            }
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          bumpWorkspaceReload();
        })
        .catch((err: unknown) => {
          onError(err, t('sidebar.renameFailed'));
        })
        .finally(() => {
          if (!renamed && workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          setSessionBusy(sessionId, false, workspaceCwd);
        });
    },
    [
      actions,
      bumpWorkspaceReload,
      canRenameSession,
      cancelRename,
      editingSession,
      editingSessionIdentity,
      getIdentityForSession,
      getSessionWorkspaceCwd,
      isCurrentSession,
      onSessionRenameConfirmed,
      onError,
      sessionCatalogController,
      setSessionBusy,
      t,
      workspace.client,
    ],
  );

  const handleDeleteSession = useCallback(
    (session: DaemonSessionSummary) => {
      if (!canDeleteSession(session)) return;
      setDeleteCandidate(session);
    },
    [canDeleteSession],
  );

  const setSessionExporting = useCallback(
    (sessionId: string, exporting: boolean, workspaceCwd?: string) => {
      const identity = getSessionIdentity(
        sessionId,
        workspaceCwd || primaryWorkspaceCwd,
      );
      const next = new Set(exportingSessionIdsRef.current);
      if (exporting) {
        next.add(identity);
      } else {
        next.delete(identity);
      }
      exportingSessionIdsRef.current = next;
      setExportingSessionIds(next);
    },
    [primaryWorkspaceCwd],
  );

  const handleExportSession = useCallback(
    (session: DaemonSessionSummary) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      const archived = session.isArchived === true;
      const activeExportScope = getActiveExportScope(session);
      if (
        !sessionActionItems.has('export') ||
        (archived
          ? !getArchivedExportWorkspaceCwd(session)
          : !activeExportScope) ||
        exportingSessionIdsRef.current.has(sessionIdentity)
      ) {
        return;
      }
      setSessionExporting(sessionId, true, session.workspaceCwd);
      void (async () => {
        try {
          let result;
          if (archived) {
            const workspaceCwd = getArchivedExportWorkspaceCwd(session);
            if (!workspaceCwd) return;
            result = await workspace.client
              .workspaceByCwd(workspaceCwd)
              .exportArchivedSession(sessionId, { format: 'html' });
          } else if (activeExportScope?.kind === 'primary') {
            result = await exportSession(sessionId, 'html');
          } else if (activeExportScope?.kind === 'locked') {
            result = await workspace.client
              .workspaceByCwd(activeExportScope.cwd)
              .exportSession(sessionId, { format: 'html' });
          } else {
            return;
          }
          const blob = new Blob([result.content], {
            type: result.mimeType || 'text/html',
          });
          const url = URL.createObjectURL(blob);
          try {
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
          } finally {
            URL.revokeObjectURL(url);
          }
        } catch (err) {
          onError(err, t('sidebar.exportFailed'));
        } finally {
          setSessionExporting(sessionId, false, session.workspaceCwd);
        }
      })();
    },
    [
      exportSession,
      getActiveExportScope,
      getArchivedExportWorkspaceCwd,
      getIdentityForSession,
      onError,
      setSessionExporting,
      sessionActionItems,
      t,
      workspace.client,
    ],
  );

  const confirmDeleteSession = useCallback(() => {
    if (!deleteCandidate) return;
    const sessionId = deleteCandidate.sessionId;
    const sessionIdentity = getIdentityForSession(deleteCandidate);
    if (!canDeleteSession(deleteCandidate)) {
      setDeleteCandidate(null);
      return;
    }
    // Captured before the request: the daemon's terminal `session_closed`
    // frame clears `connection.sessionId` before the delete resolves, so this
    // is the last point where the attachment is still readable (#12619).
    const attachedSessionId = isCurrentSession(deleteCandidate)
      ? sessionId
      : undefined;
    const scope = resolveSessionWorkspaceScope(deleteCandidate);
    const isArchived = Boolean(deleteCandidate.isArchived);
    const removeSession =
      scope.kind === 'locked' || scope.kind === 'restricted'
        ? async (id: string) => {
            const invalidateDeleted = generatedUiOwner?.captureSessionDeletion(
              scope.cwd,
            );
            const result = await workspace.client
              .workspaceByCwd(scope.cwd)
              .deleteSessionsData([id]);
            invalidateDeleted?.([...result.removed, ...result.notFound]);
            const itemError = result.errors.find(
              (entry) => entry.sessionId === id,
            );
            if (itemError) throw new Error(itemError.error);
          }
        : scope.kind === 'primary'
          ? isArchived
            ? deleteArchivedSession
            : deleteSession
          : undefined;
    setDeleteCandidate(null);
    if (!removeSession) return;
    if (busySessionIdsRef.current.has(sessionIdentity)) return;
    setSessionBusy(sessionId, true, deleteCandidate.workspaceCwd);
    removeSession(sessionId)
      .then(() => {
        onSessionsDeleted?.([sessionId], { attachedSessionId });
        bumpWorkspaceReload();
      })
      .catch((err: unknown) => onError(err, t('sidebar.deleteFailed')))
      .finally(() => {
        const workspaceCwd =
          deleteCandidate.workspaceCwd ?? primaryWorkspaceCwd;
        if (scope.kind !== 'primary' && workspaceCwd) {
          sessionCatalogController.refreshWorkspace(workspaceCwd);
        }
        setSessionBusy(sessionId, false, deleteCandidate.workspaceCwd);
      });
  }, [
    bumpWorkspaceReload,
    canDeleteSession,
    deleteArchivedSession,
    deleteCandidate,
    deleteSession,
    generatedUiOwner,
    getIdentityForSession,
    isCurrentSession,
    onError,
    onSessionsDeleted,
    primaryWorkspaceCwd,
    resolveSessionWorkspaceScope,
    sessionCatalogController,
    setSessionBusy,
    t,
    workspace.client,
  ]);

  const handleRenameFromMenu = useCallback(
    (session: DaemonSessionSummary) => {
      renameFocusSuppressRef.current = true;
      startRename(session);
    },
    [startRename],
  );

  const handleCreateGroup = useCallback(() => {
    if (!canOrganizeWorkspace()) return;
    setGroupMenu(null);
    setGroupName('');
    setGroupColor(getDefaultGroupColor(colorOptions));
    setLastValidCustomGroupColor(DEFAULT_CUSTOM_GROUP_COLOR);
    setGroupEditor({ mode: 'create' });
  }, [canOrganizeWorkspace, colorOptions]);

  const handleCreateWorkspaceGroup = useCallback(
    (workspaceCwd: string) => {
      if (!canOrganizeWorkspace(workspaceCwd)) return;
      void (async () => {
        try {
          const catalog = await workspace.client
            .workspaceByCwd(workspaceCwd)
            .listSessionGroups();
          setGroupMenu(null);
          setGroupName('');
          setGroupColor(getDefaultGroupColor(catalog.colorOptions));
          setLastValidCustomGroupColor(DEFAULT_CUSTOM_GROUP_COLOR);
          setGroupEditor({ mode: 'create', workspaceCwd });
        } catch (err) {
          onError(err, t('sidebar.groupsLoadFailed'));
        }
      })();
    },
    [canOrganizeWorkspace, onError, t, workspace.client],
  );

  const handleCreateGroupForSession = useCallback(
    (session: DaemonSessionSummary) => {
      if (!canOrganizeSession(session, 'group')) return;
      setGroupMenu(null);
      setGroupName('');
      setGroupColor(getDefaultGroupColor(colorOptions));
      setLastValidCustomGroupColor(DEFAULT_CUSTOM_GROUP_COLOR);
      setGroupEditor({
        mode: 'create',
        targetSession: session,
        workspaceCwd: session.workspaceCwd,
      });
    },
    [canOrganizeSession, colorOptions],
  );

  const handleRenameGroup = useCallback(
    (group: DaemonSessionGroup, workspaceCwd?: string) => {
      if (!canOrganizeWorkspace(workspaceCwd)) return;
      setGroupName(group.name);
      setGroupColor(group.color);
      setLastValidCustomGroupColor(
        normalizeHexColorInput(group.color) ?? DEFAULT_CUSTOM_GROUP_COLOR,
      );
      setGroupEditor({ mode: 'edit', group, workspaceCwd });
    },
    [canOrganizeWorkspace],
  );

  const closeGroupEditor = useCallback(() => {
    if (groupBusy) return;
    setGroupEditor(null);
    setGroupName('');
    setGroupColor(getDefaultGroupColor(colorOptions));
    setLastValidCustomGroupColor(DEFAULT_CUSTOM_GROUP_COLOR);
  }, [colorOptions, groupBusy]);

  const saveGroupEditor = useCallback(() => {
    if (!groupEditor) return;
    if (
      !canOrganizeWorkspace(groupEditor.workspaceCwd) ||
      (groupEditor.targetSession &&
        !canOrganizeSession(groupEditor.targetSession, 'group'))
    ) {
      closeGroupEditor();
      return;
    }
    const name = groupName.trim();
    const color = normalizeGroupColorInput(
      groupColor,
      colorOptions.length > 0 ? colorOptions : SESSION_GROUP_COLORS,
    );
    if (!name || !color) return;
    void (async () => {
      setGroupBusy(true);
      const reportCreatedGroupAssignmentFailure = (error: unknown) => {
        setGroupEditor(null);
        setGroupName('');
        if (groupEditor.workspaceCwd) {
          bumpWorkspaceReload();
        } else {
          void reloadGroups().catch(() => undefined);
        }
        onError(error, t('sidebar.groupAssignFailedAfterCreate'));
      };
      try {
        const scope = resolveWorkspaceScope(groupEditor.workspaceCwd);
        const groupActions =
          scope.kind === 'primary'
            ? workspaceActions
            : scope.kind === 'locked' || scope.kind === 'restricted'
              ? workspace.client.workspaceByCwd(scope.cwd)
              : undefined;
        if (!groupActions) return;
        const group =
          groupEditor.mode === 'create'
            ? await groupActions.createSessionGroup({
                name,
                color,
              })
            : await groupActions.updateSessionGroup(groupEditor.group!.id, {
                name,
                color,
              });
        if (groupEditor.mode === 'create') {
          if (groupEditor.targetSession) {
            try {
              const livePolicy = groupAssignmentPolicyRef.current;
              const targetScope = livePolicy?.resolveWorkspaceScope(
                groupEditor.targetSession.workspaceCwd,
              );
              if (
                !livePolicy ||
                !targetScope ||
                !livePolicy.canOrganizeSession(
                  groupEditor.targetSession,
                  'group',
                ) ||
                targetScope.kind !== scope.kind ||
                targetScope.cwd !== scope.cwd
              ) {
                reportCreatedGroupAssignmentFailure(
                  new Error(t('sidebar.groupAssignFailedAfterCreate')),
                );
                return;
              }
              const targetActions = livePolicy.getSessionWorkspaceActions(
                groupEditor.targetSession,
              );
              if (!targetActions) {
                reportCreatedGroupAssignmentFailure(
                  new Error(t('sidebar.groupAssignFailedAfterCreate')),
                );
                return;
              }
              await targetActions.updateSessionOrganization(
                groupEditor.targetSession.sessionId,
                // Assigning a named group clears any color tag (single choice
                // in the UI), matching assignSessionGroup.
                { groupId: group.id, color: null },
              );
              bumpWorkspaceReload();
            } catch (err) {
              reportCreatedGroupAssignmentFailure(err);
              return;
            }
          }
        }
        setGroupEditor(null);
        setGroupName('');
        if (groupEditor.workspaceCwd) {
          bumpWorkspaceReload();
        } else {
          void reloadGroups().catch(() => undefined);
        }
      } catch (err) {
        onError(
          err,
          groupEditor.mode === 'create'
            ? t('sidebar.groupCreateFailed')
            : t('sidebar.groupUpdateFailed'),
        );
      } finally {
        const workspaceCwd = groupEditor.workspaceCwd ?? primaryWorkspaceCwd;
        if (workspaceCwd) {
          sessionCatalogController.refreshWorkspace(workspaceCwd);
        }
        setGroupBusy(false);
      }
    })();
  }, [
    bumpWorkspaceReload,
    colorOptions,
    groupColor,
    groupEditor,
    groupName,
    canOrganizeSession,
    canOrganizeWorkspace,
    closeGroupEditor,
    onError,
    primaryWorkspaceCwd,
    reloadGroups,
    resolveWorkspaceScope,
    sessionCatalogController,
    t,
    workspaceActions,
    workspace.client,
  ]);

  const handleDeleteGroup = useCallback(
    (group: DaemonSessionGroup, workspaceCwd?: string) => {
      if (!canOrganizeWorkspace(workspaceCwd)) return;
      setDeleteGroupCandidate({ group, workspaceCwd });
    },
    [canOrganizeWorkspace],
  );

  const confirmDeleteGroup = useCallback(() => {
    if (!deleteGroupCandidate) return;
    if (!canOrganizeWorkspace(deleteGroupCandidate.workspaceCwd)) {
      setDeleteGroupCandidate(null);
      return;
    }
    setGroupBusy(true);
    const scope = resolveWorkspaceScope(deleteGroupCandidate.workspaceCwd);
    const groupActions =
      scope.kind === 'primary'
        ? workspaceActions
        : scope.kind === 'locked' || scope.kind === 'restricted'
          ? workspace.client.workspaceByCwd(scope.cwd)
          : undefined;
    if (!groupActions) {
      setGroupBusy(false);
      return;
    }
    groupActions
      .deleteSessionGroup(deleteGroupCandidate.group.id)
      .then(() => {
        setDeleteGroupCandidate(null);
        if (deleteGroupCandidate.workspaceCwd) {
          bumpWorkspaceReload();
        }
      })
      .catch((err: unknown) => onError(err, t('sidebar.groupDeleteFailed')))
      .then(() =>
        deleteGroupCandidate.workspaceCwd
          ? undefined
          : reloadGroups().catch(() => undefined),
      )
      .finally(() => {
        const workspaceCwd =
          deleteGroupCandidate.workspaceCwd ?? primaryWorkspaceCwd;
        if (workspaceCwd) {
          sessionCatalogController.refreshWorkspace(workspaceCwd);
        }
        setGroupBusy(false);
      });
  }, [
    deleteGroupCandidate,
    canOrganizeWorkspace,
    onError,
    primaryWorkspaceCwd,
    reloadGroups,
    t,
    bumpWorkspaceReload,
    resolveWorkspaceScope,
    sessionCatalogController,
    workspace.client,
    workspaceActions,
  ]);

  useEffect(() => {
    if (deleteCandidate && !canDeleteSession(deleteCandidate)) {
      setDeleteCandidate(null);
    }
  }, [canDeleteSession, deleteCandidate]);

  useEffect(() => {
    if (groupMenu && !canOrganizeSession(groupMenu.session, 'group')) {
      setGroupMenu(null);
    }
  }, [canOrganizeSession, groupMenu]);

  useEffect(() => {
    if (
      groupEditor &&
      (!canOrganizeWorkspace(groupEditor.workspaceCwd) ||
        (groupEditor.targetSession &&
          !canOrganizeSession(groupEditor.targetSession, 'group')))
    ) {
      setGroupEditor(null);
      setGroupName('');
    }
  }, [canOrganizeSession, canOrganizeWorkspace, groupEditor]);

  useEffect(() => {
    if (
      deleteGroupCandidate &&
      !canOrganizeWorkspace(deleteGroupCandidate.workspaceCwd)
    ) {
      setDeleteGroupCandidate(null);
    }
  }, [canOrganizeWorkspace, deleteGroupCandidate]);

  const handleTogglePin = useCallback(
    (session: DaemonSessionSummary) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      if (
        !canOrganizeSession(session, 'pin') ||
        busySessionIdsRef.current.has(sessionIdentity)
      ) {
        return;
      }
      const targetPinned = !session.isPinned;
      const workspaceCwd = session.workspaceCwd ?? primaryWorkspaceCwd;
      const optimisticPinnedAt = new Date().toISOString();
      const storeToggle = (pinned: boolean, pinnedAt?: string): void => {
        if (!workspaceCwd) return;
        sessionCatalogController.toggleSessionPinned(workspaceCwd, session, {
          pinned,
          ...(pinned && pinnedAt !== undefined ? { pinnedAt } : {}),
        });
      };
      let rpcSucceeded = false;
      const markRpcSettled = (): void => {
        setOptimisticPins((previous) => {
          const entry = previous.get(sessionIdentity);
          if (!entry) return previous;
          const next = new Map(previous);
          next.set(sessionIdentity, { ...entry, rpcSettled: true });
          return next;
        });
      };
      const applyOptimistic = (): void => {
        setOptimisticPins((previous) => {
          const next = new Map(previous);
          next.set(sessionIdentity, {
            session,
            pinned: targetPinned,
            rpcSettled: false,
            ...(targetPinned ? { pinnedAt: optimisticPinnedAt } : {}),
          });
          return next;
        });
      };
      const rollbackOptimistic = (): void => {
        setOptimisticPins((previous) => {
          if (!previous.has(sessionIdentity)) return previous;
          const next = new Map(previous);
          next.delete(sessionIdentity);
          return next;
        });
      };
      // Reflect the toggle immediately. The catalog store applies it to
      // every loaded page so churn cannot drop it, and the refresh below
      // replaces those pages with authoritative state when it lands.
      applyOptimistic();
      storeToggle(targetPinned, optimisticPinnedAt);
      setSessionBusy(sessionId, true, session.workspaceCwd);
      const sessionActions = getSessionWorkspaceActions(session);
      if (!sessionActions) {
        rollbackOptimistic();
        storeToggle(!targetPinned, session.pinnedAt);
        setSessionBusy(sessionId, false, session.workspaceCwd);
        return;
      }
      sessionActions
        .updateSessionOrganization(sessionId, {
          isPinned: targetPinned,
        })
        .then(() => {
          rpcSucceeded = true;
          bumpWorkspaceReload();
        })
        .catch((err: unknown) => {
          rollbackOptimistic();
          storeToggle(!targetPinned, session.pinnedAt);
          onError(err, t('sidebar.organizationFailed'));
        })
        .finally(() => {
          if (workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          if (rpcSucceeded) markRpcSettled();
          setSessionBusy(sessionId, false, session.workspaceCwd);
        });
    },
    [
      bumpWorkspaceReload,
      getIdentityForSession,
      getSessionWorkspaceActions,
      onError,
      primaryWorkspaceCwd,
      canOrganizeSession,
      sessionCatalogController,
      setSessionBusy,
      t,
    ],
  );

  const handleArchive = useCallback(
    (session: DaemonSessionSummary) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      // The daemon force-ends a live turn on archive; keep the current
      // session off-limits, mirroring the delete guard.
      if (!canArchiveSession(session)) return;
      if (busySessionIdsRef.current.has(sessionIdentity)) return;
      const scope = resolveSessionWorkspaceScope(session);
      setSessionBusy(sessionId, true, session.workspaceCwd);
      void (async () => {
        try {
          if (scope.kind === 'locked' || scope.kind === 'restricted') {
            const result = await workspace.client
              .workspaceByCwd(scope.cwd)
              .archiveSessionsData([sessionId]);
            const itemError = result.errors.find(
              (entry) => entry.sessionId === sessionId,
            );
            if (itemError) {
              onError(new Error(itemError.error), t('sidebar.archiveFailed'));
            }
          } else if (scope.kind === 'primary') {
            await archiveSession(sessionId);
          } else {
            return;
          }
        } catch (err) {
          onError(err, t('sidebar.archiveFailed'));
        } finally {
          bumpWorkspaceReload();
          const workspaceCwd = session.workspaceCwd ?? primaryWorkspaceCwd;
          if (scope.kind !== 'primary' && workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          setSessionBusy(sessionId, false, session.workspaceCwd);
        }
      })();
    },
    [
      archiveSession,
      bumpWorkspaceReload,
      canArchiveSession,
      getIdentityForSession,
      onError,
      primaryWorkspaceCwd,
      sessionCatalogController,
      setSessionBusy,
      t,
      resolveSessionWorkspaceScope,
      workspace.client,
    ],
  );

  const handleUnarchive = useCallback(
    (session: DaemonSessionSummary) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      if (!canUnarchiveSession(session)) return;
      if (busySessionIdsRef.current.has(sessionIdentity)) return;
      const scope = resolveSessionWorkspaceScope(session);
      setSessionBusy(sessionId, true, session.workspaceCwd);
      void (async () => {
        try {
          if (scope.kind === 'locked' || scope.kind === 'restricted') {
            const result = await workspace.client
              .workspaceByCwd(scope.cwd)
              .unarchiveSessionsData([sessionId]);
            const itemError = result.errors.find(
              (entry) => entry.sessionId === sessionId,
            );
            if (itemError) {
              onError(new Error(itemError.error), t('sidebar.unarchiveFailed'));
            }
          } else if (scope.kind === 'primary') {
            await unarchiveSession(sessionId);
          } else {
            return;
          }
        } catch (err) {
          onError(err, t('sidebar.unarchiveFailed'));
        } finally {
          bumpWorkspaceReload();
          const workspaceCwd = session.workspaceCwd ?? primaryWorkspaceCwd;
          if (scope.kind !== 'primary' && workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          setSessionBusy(sessionId, false, session.workspaceCwd);
        }
      })();
    },
    [
      bumpWorkspaceReload,
      canUnarchiveSession,
      getIdentityForSession,
      onError,
      primaryWorkspaceCwd,
      sessionCatalogController,
      setSessionBusy,
      t,
      unarchiveSession,
      resolveSessionWorkspaceScope,
      workspace.client,
    ],
  );

  const openGroupMenuFromAnchor = useCallback(
    async (anchorEl: HTMLElement, session: DaemonSessionSummary) => {
      if (!canOrganizeSession(session, 'group')) return;
      let groupCount = 0;
      try {
        const sessionActions = getSessionWorkspaceActions(session);
        if (!sessionActions) return;
        const catalog = await sessionActions.listSessionGroups();
        if (!canOrganizeSession(session, 'group')) return;
        setMenuGroups(catalog.groups);
        setColorOptions(catalog.colorOptions);
        groupCount = catalog.groups.length;
      } catch (err) {
        onError(err, t('sidebar.groupsLoadFailed'));
        return;
      }
      if (!anchorEl.isConnected) return;
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth =
        typeof window === 'undefined'
          ? rect.right + GROUP_MENU_WIDTH
          : window.innerWidth;
      const viewportHeight =
        typeof window === 'undefined' ? rect.top + 320 : window.innerHeight;
      const estimatedHeight = Math.min(
        320,
        34 * (groupCount + SESSION_GROUP_COLORS.length + 2) + 25,
      );
      const left =
        rect.right + GROUP_MENU_MARGIN + GROUP_MENU_WIDTH <= viewportWidth
          ? rect.right + GROUP_MENU_MARGIN
          : Math.max(
              GROUP_MENU_MARGIN,
              rect.left - GROUP_MENU_WIDTH - GROUP_MENU_MARGIN,
            );
      const top = Math.max(
        GROUP_MENU_MARGIN,
        Math.min(
          rect.top,
          viewportHeight - estimatedHeight - GROUP_MENU_MARGIN,
        ),
      );
      setGroupMenu({
        session,
        top,
        left,
      });
    },
    [canOrganizeSession, getSessionWorkspaceActions, onError, t],
  );

  const assignSessionGroup = useCallback(
    (session: DaemonSessionSummary, groupId: string | null) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      if (
        !canOrganizeSession(session, 'group') ||
        busySessionIdsRef.current.has(sessionIdentity)
      ) {
        return;
      }
      setGroupMenu(null);
      setSessionBusy(sessionId, true, session.workspaceCwd);
      const sessionActions = getSessionWorkspaceActions(session);
      if (!sessionActions) {
        setSessionBusy(sessionId, false, session.workspaceCwd);
        return;
      }
      sessionActions
        // Group and color are a single choice in the UI: assigning a named
        // group (or "Ungrouped", groupId=null) clears any color tag.
        .updateSessionOrganization(sessionId, { groupId, color: null })
        .then(() => {
          bumpWorkspaceReload();
        })
        .catch((err: unknown) => onError(err, t('sidebar.organizationFailed')))
        .finally(() => {
          const workspaceCwd = session.workspaceCwd ?? primaryWorkspaceCwd;
          if (workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          setSessionBusy(sessionId, false, session.workspaceCwd);
        });
    },
    [
      bumpWorkspaceReload,
      getIdentityForSession,
      getSessionWorkspaceActions,
      onError,
      primaryWorkspaceCwd,
      canOrganizeSession,
      sessionCatalogController,
      setSessionBusy,
      t,
    ],
  );

  const assignSessionColor = useCallback(
    (
      session: DaemonSessionSummary,
      color: DaemonSessionGroupPresetColor | null,
    ) => {
      const sessionId = session.sessionId;
      const sessionIdentity = getIdentityForSession(session);
      if (
        !canOrganizeSession(session, 'group') ||
        busySessionIdsRef.current.has(sessionIdentity)
      ) {
        return;
      }
      setGroupMenu(null);
      setSessionBusy(sessionId, true, session.workspaceCwd);
      const sessionActions = getSessionWorkspaceActions(session);
      if (!sessionActions) {
        setSessionBusy(sessionId, false, session.workspaceCwd);
        return;
      }
      sessionActions
        // Picking a color clears any named-group assignment (single choice).
        .updateSessionOrganization(sessionId, { color, groupId: null })
        .then(() => {
          bumpWorkspaceReload();
        })
        .catch((err: unknown) => onError(err, t('sidebar.organizationFailed')))
        .finally(() => {
          const workspaceCwd = session.workspaceCwd ?? primaryWorkspaceCwd;
          if (workspaceCwd) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
          setSessionBusy(sessionId, false, session.workspaceCwd);
        });
    },
    [
      bumpWorkspaceReload,
      getIdentityForSession,
      getSessionWorkspaceActions,
      onError,
      primaryWorkspaceCwd,
      canOrganizeSession,
      sessionCatalogController,
      setSessionBusy,
      t,
    ],
  );

  const searchedSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    // Keep the daemon catalog order: the organized bucketing below relies on
    // it (pinned rows sort first there); the flat view re-sorts by recency on
    // its own, so no sort here.
    const sourceScopedSessions = sessions
      .map(applyOptimisticPin)
      .filter((session) =>
        matchesSessionSource(session, selectedSessionSource),
      );
    if (!query) return sourceScopedSessions;
    const localMatches = sourceScopedSessions.filter((session) => {
      const label = getSessionLabel(session).toLowerCase();
      return (
        label.includes(query) ||
        session.sessionId.toLowerCase().includes(query) ||
        sessionMatchesGitQuery(session, query)
      );
    });
    // Merge daemon transcript-content hits into the local fast-path
    // matches (shared with WorkspaceSection's copy — see sessionSearch).
    return mergeSessionContentHits(
      sourceScopedSessions,
      localMatches,
      contentSearchHits,
      selectedSessionSource,
      applyOptimisticPin,
    );
  }, [
    applyOptimisticPin,
    contentSearchHits,
    searchQuery,
    selectedSessionSource,
    sessions,
  ]);
  // Content-search hits the loaded catalog doesn't carry ("ghosts"). A
  // pinned ghost must still render somewhere while its hit is active:
  // the filters below drop pinned rows because loaded pinned sessions
  // render in the Pinned section — but when the Pinned section DOES
  // carry the session (pinned page settled, or an optimistic pin), the
  // ghost must not be retained too: pinned rows have exactly one owner.
  const searchGhostIds = useMemo(() => {
    const catalogIds = new Set(sessions.map((session) => session.sessionId));
    const ghosts = new Set<string>();
    for (const hit of contentSearchHits.values()) {
      if (catalogIds.has(hit.session.sessionId)) continue;
      if (pinnedSectionIdentities.has(getIdentityForSession(hit.session))) {
        continue;
      }
      ghosts.add(hit.session.sessionId);
    }
    return ghosts;
  }, [
    contentSearchHits,
    getIdentityForSession,
    pinnedSectionIdentities,
    sessions,
  ]);
  const isPinnedSectionMember = useCallback(
    (session: DaemonSessionSummary) =>
      pinnedSectionIdentities.has(getIdentityForSession(session)),
    [getIdentityForSession, pinnedSectionIdentities],
  );
  const filteredSessions = useMemo(() => {
    const unpinnedSessions =
      selectedSessionSource === 'channel'
        ? searchedSessions
        : searchedSessions.filter(
            (session) =>
              !session.isPinned || searchGhostIds.has(session.sessionId),
          );
    const nextSessions = unpinnedSessions.slice();
    if (organizationEnabled) {
      return nextSessions;
    }
    const createdTimeById = new Map(
      nextSessions.map((session) => [
        session.sessionId,
        getSessionCreatedTime(session),
      ]),
    );
    return nextSessions.sort(
      (a, b) =>
        (createdTimeById.get(b.sessionId) ?? 0) -
        (createdTimeById.get(a.sessionId) ?? 0),
    );
  }, [
    organizationEnabled,
    searchGhostIds,
    searchedSessions,
    selectedSessionSource,
  ]);

  const sessionTree = useSessionTree(
    primaryWorkspaceExpansionId,
    searchedSessions,
    searchQuery.trim().length > 0,
  );
  const channelCatalogLoaded = channelCatalogData !== undefined;
  const channelSessionSections = useMemo(
    () =>
      selectedSessionSource === 'channel' && channelCatalogLoaded
        ? groupSessionsByChannelType(
            filteredSessions,
            channelTypeCatalog,
            channelInstances,
            t('sidebar.channelType.other'),
          )
        : null,
    [
      channelCatalogLoaded,
      channelInstances,
      channelTypeCatalog,
      filteredSessions,
      selectedSessionSource,
      t,
    ],
  );

  const sessionSections = useMemo<SessionSection[]>(() => {
    const searching = searchQuery.trim().length > 0;
    const validGroupIds = new Set(groups.map((group) => group.id));
    const sessionsByColor = new Map<
      DaemonSessionGroupPresetColor,
      DaemonSessionSummary[]
    >();
    const sessionsByGroupId = new Map<string, DaemonSessionSummary[]>();
    const scheduledTaskSections = new Map<
      string,
      ScheduledTaskSessionSection
    >();
    for (const group of groups) {
      sessionsByGroupId.set(group.id, []);
    }
    const recentSessions: DaemonSessionSummary[] = [];
    // Bucket the search-filtered catalog in one pass, pinned rows included:
    // they are lifted into the Pinned section, but their group/color section
    // must keep them, otherwise a section whose members are all pinned
    // rendered `· 0`, indistinguishable from lost memberships (#10391).
    // One pass (instead of bucketing the unpinned rows first and appending
    // the pinned ones) preserves the daemon catalog order — pinned rows sort
    // first there — so a pinned member is never pushed behind its section's
    // preview limit by rows it sorts ahead of.
    for (const session of searchedSessions) {
      // Color takes precedence: the picker keeps color and group mutually
      // exclusive, but stay defensive if a store somehow carries both.
      if (
        organizationEnabled &&
        session.color &&
        SESSION_GROUP_COLORS.includes(session.color)
      ) {
        const bucket = sessionsByColor.get(session.color) ?? [];
        bucket.push(session);
        sessionsByColor.set(session.color, bucket);
        continue;
      }
      const groupSessions =
        session.groupId && validGroupIds.has(session.groupId)
          ? sessionsByGroupId.get(session.groupId)
          : undefined;
      if (groupSessions) {
        groupSessions.push(session);
        continue;
      }
      if (collectScheduledTaskSession(scheduledTaskSections, session)) {
        continue;
      }
      // On sources with a Pinned section, a pinned session without a
      // (renderable) group stays Pinned-section-only; it never spills into
      // Ungrouped. The channel source has no Pinned section, so its pinned
      // rows keep the normal Ungrouped bucket. Pinned content-search ghosts
      // are exempt: the Pinned section never sees them, so dropping them
      // here would render the matching session nowhere.
      if (
        session.isPinned &&
        selectedSessionSource !== 'channel' &&
        !searchGhostIds.has(session.sessionId)
      ) {
        continue;
      }
      recentSessions.push(session);
    }
    const sections: SessionSection[] = [];
    // Color buckets first, in palette order; only render non-empty ones so the
    // sidebar never shows six empty color headers.
    for (const color of SESSION_GROUP_COLORS) {
      const colorSessions = sessionsByColor.get(color);
      if (!colorSessions || colorSessions.length === 0) continue;
      sections.push({
        id: `color:${color}`,
        kind: 'color',
        label: t(`sidebar.groupColor.${color}`),
        countLabel: String(colorSessions.length),
        color,
        sessions: colorSessions,
      });
    }
    // Named groups next (kept visible even when empty, unless searching).
    for (const group of groups) {
      const groupSessions = sessionsByGroupId.get(group.id) ?? [];
      if (searching && groupSessions.length === 0) continue;
      sections.push({
        id: `group:${group.id}`,
        kind: 'group',
        label: group.name,
        countLabel: String(groupSessions.length),
        color: group.color,
        group,
        sessions: groupSessions,
      });
    }
    for (const section of scheduledTaskSections.values()) {
      sections.push({ ...section, kind: 'scheduled-task' });
    }
    if (recentSessions.length > 0 && sections.length > 0) {
      sections.push({
        id: RECENT_SESSION_SECTION_ID,
        kind: 'recent',
        label: t('sidebar.groupUngrouped'),
        countLabel: String(recentSessions.length),
        sessions: recentSessions,
      });
    }
    return sections;
  }, [
    groups,
    organizationEnabled,
    searchGhostIds,
    searchedSessions,
    searchQuery,
    selectedSessionSource,
    t,
  ]);

  useEffect(() => {
    const activeSections = channelSessionSections ?? sessionSections;
    if (selectedSessionSource === 'channel') {
      if (!channelCatalogLoaded) return;
      // The refetch for the new source retains the previous source's page
      // until it settles; wait for a page fetched for the channel source.
      if (settledSessionsSourceRef.current !== 'channel') return;
    } else {
      if (!sessionsCatalogReady) return;
      if (organizationEnabled && !groupsCatalogReady) return;
    }
    const unseenIds = activeSections
      .map((section) => section.id)
      .filter((id) => !knownSessionSectionIdsRef.current.has(id));
    const isInitialCatalog =
      awaitingInitialSessionCatalogBySourceRef.current[sessionSource];
    if (isInitialCatalog) {
      // First-sync registration must reflect the full unfiltered catalog:
      // sections hidden by an active search would never register and would
      // later auto-collapse as mid-session additions. An empty first catalog
      // keeps the latch so the first real sections still register as initial
      // — channel sessions are externally driven and can arrive while the
      // tab is open on an empty settle.
      if (searchQuery.trim() || activeSections.length === 0) return;
      awaitingInitialSessionCatalogBySourceRef.current[sessionSource] = false;
      for (const id of unseenIds) knownSessionSectionIdsRef.current.add(id);
      return;
    }
    if (unseenIds.length === 0) return;
    for (const id of unseenIds) knownSessionSectionIdsRef.current.add(id);
    // Brand-new sections that appear mid-session still start collapsed.
    setCollapsedSessionSectionIds((current) => {
      const next = new Set(current);
      for (const id of unseenIds) next.add(id);
      return next;
    });
  }, [
    groupsCatalogReady,
    channelCatalogLoaded,
    channelSessionSections,
    organizationEnabled,
    searchQuery,
    selectedSessionSource,
    sessionSections,
    sessionSource,
    sessionsCatalogReady,
  ]);

  useEffect(() => {
    replaceOwnedCollapsedSessionSectionIds(
      collapsedSessionSectionIds,
      isPrimaryCollapsedSectionId,
    );
  }, [collapsedSessionSectionIds]);

  const toggleSessionSection = useCallback((sectionId: string) => {
    setCollapsedSessionSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (collapsed || mobileOpen) return;
      event.preventDefault();
      resizeTeardownRef.current?.(true);
      // Suppress the width transition before measuring so a drag started
      // mid-animation measures the settled width, not an intermediate one.
      sidebarRef.current?.classList.add(styles.resizing);
      setIsResizing(true);
      const startX = event.clientX;
      const startWidth =
        sidebarRef.current?.getBoundingClientRect().width || sidebarWidth;
      // Collapse-by-drag restores the state width, never the measured one:
      // the rect can lag a running transition or sit under the container cap.
      const startStateWidth = sidebarWidth;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      let collapsedByDrag = false;
      let teardown: (updateState: boolean) => void = () => undefined;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; window listeners still handle drag.
      }
      function getRawWidth(clientX: number) {
        return startWidth + clientX - startX;
      }
      function restoreExpandedWidth() {
        const restoredWidth = clampSidebarWidth(
          startStateWidth,
          sidebarMinWidth,
        );
        setSidebarWidth(restoredWidth);
        writeSidebarWidth(restoredWidth);
      }
      function collapseFromDrag() {
        if (collapsedByDrag) return;
        collapsedByDrag = true;
        restoreExpandedWidth();
        teardown(true);
        onCollapsedChange(true);
      }
      function handlePointerMove(moveEvent: PointerEvent) {
        const rawWidth = getRawWidth(moveEvent.clientX);
        if (rawWidth <= SIDEBAR_COLLAPSE_DRAG_WIDTH) {
          collapseFromDrag();
          return;
        }
        setSidebarWidth(
          clampSidebarVisualWidth(rawWidth, sidebarMinWidth, containerWidth),
        );
      }
      teardown = function resizeTeardown(updateState: boolean) {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
        resizeTeardownRef.current = null;
        if (updateState) {
          setIsResizing(false);
        }
      };
      function handlePointerUp(upEvent: PointerEvent) {
        // A press-release without movement is a click, not a drag. Persisting
        // here would store the container-capped rendered width over the user's
        // wider preference; pointer moves may also have clamped the state
        // width to that cap, so restore the pre-drag width in state as well.
        if (upEvent.clientX === startX) {
          setSidebarWidth(clampSidebarWidth(startStateWidth, sidebarMinWidth));
          teardown(true);
          return;
        }
        const rawWidth = getRawWidth(upEvent.clientX);
        if (rawWidth <= SIDEBAR_COLLAPSE_DRAG_WIDTH) {
          collapseFromDrag();
          return;
        }
        const nextWidth = clampSidebarVisualWidth(
          rawWidth,
          sidebarMinWidth,
          containerWidth,
        );
        // A drag that ends past the container cap while the cap already
        // bound the start width could never move the visible edge. Storing
        // the capped width would let a temporarily narrow host shrink the
        // user's preference, so keep the pre-drag (window-capped) width.
        const cappedByContainer =
          rawWidth >= getSidebarDragMaxWidth(containerWidth) &&
          startStateWidth > nextWidth;
        // While the cap binds, the rendered edge cannot follow the pointer,
        // so the rect-based delta is container-scoped in *both* directions:
        // persisting it would overwrite the window-scoped preference with a
        // narrow value on an ordinary leftward jitter. Map the pointer delta
        // onto the state width instead; the visible width still renders under
        // the cap, the same snap the past-cap branch already accepts.
        const capBoundAtStart = startStateWidth > startWidth;
        const finalWidth = cappedByContainer
          ? clampSidebarWidth(startStateWidth, sidebarMinWidth)
          : capBoundAtStart
            ? clampSidebarWidth(
                startStateWidth + (rawWidth - startWidth),
                sidebarMinWidth,
              )
            : nextWidth;
        setSidebarWidth(finalWidth);
        writeSidebarWidth(finalWidth);
        teardown(true);
      }
      function handlePointerCancel() {
        teardown(true);
      }
      resizeTeardownRef.current = teardown;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
      window.addEventListener('pointercancel', handlePointerCancel, {
        once: true,
      });
    },
    [
      collapsed,
      mobileOpen,
      onCollapsedChange,
      sidebarWidth,
      sidebarMinWidth,
      containerWidth,
    ],
  );

  const deleteCandidateLabel = deleteCandidate
    ? getCompactSessionLabel(deleteCandidate)
    : '';
  const groupMenuSelectedColor =
    groupMenu?.session.color &&
    SESSION_GROUP_COLORS.includes(groupMenu.session.color)
      ? groupMenu.session.color
      : null;
  const groupMenuSelectedGroupId =
    !groupMenuSelectedColor &&
    groupMenu?.session.groupId &&
    menuGroups.some((group) => group.id === groupMenu.session.groupId)
      ? groupMenu.session.groupId
      : null;
  const menuColorOptions =
    colorOptions.length > 0 ? colorOptions : SESSION_GROUP_COLORS;
  const groupMenuUngroupedSelected =
    groupMenuSelectedGroupId === null && groupMenuSelectedColor === null;
  const deleteGroupCandidateLabel = deleteGroupCandidate?.group.name ?? '';
  const groupColorChoices =
    colorOptions.length > 0 ? colorOptions : SESSION_GROUP_COLORS;
  const normalizedGroupColor = normalizeGroupColorInput(
    groupColor,
    groupColorChoices,
  );
  const customGroupColor = !groupColorChoices.includes(
    groupColor as DaemonSessionGroupPresetColor,
  );
  const canSaveGroup =
    groupName.trim().length > 0 &&
    normalizedGroupColor !== undefined &&
    !groupBusy;
  const groupEditorTitle =
    groupEditor?.mode === 'create'
      ? t('sidebar.groupCreate')
      : t('sidebar.groupRename');

  const renderSessionRow = useCallback(
    (
      session: DaemonSessionSummary,
      options: {
        isArchived?: boolean;
        renameFormDisabled?: boolean;
        searchSnippet?: string | undefined;
        standalone?: StandaloneSessionRowAdapter;
        tree?: SessionTreeRenderOptions;
        recent?: {
          isCurrent: boolean;
          isStandalone: boolean;
          onOpen: () => void;
          actions: ReactNode;
        };
      } = {},
    ) => {
      const {
        isArchived = false,
        renameFormDisabled = false,
        searchSnippet = searchQuery.trim()
          ? contentSearchHits.get(session.sessionId)?.snippet
          : undefined,
        standalone,
        tree,
        recent,
      } = options;
      const sessionIdentity = getIdentityForSession(session);
      const liveStarting =
        livePresence?.state === 'starting' &&
        (livePresence.coordinator?.sessionId === session.sessionId ||
          (livePresence.callId !== undefined &&
            session.sourceId === `realtime_voice:${livePresence.callId}`));
      const label = getSessionLabel(session);
      const stamp = session.updatedAt || session.createdAt;
      // Rows stay text-only; the precise date lives in the hover popover.
      const time = stamp ? formatDateTime(stamp) : '';
      const busy = standalone?.busy || busySessionIds.has(sessionIdentity);
      const exporting =
        standalone?.busy || exportingSessionIds.has(sessionIdentity);
      const completedUnread =
        !isCurrentSession(session) && completedUnreadIds.has(sessionIdentity);
      // Pinned group members also render in the Pinned section; callers
      // suppress the rename form on the duplicate row so only one input can
      // mount — a rival input's autofocus would blur this one and its blur
      // handler would cancel the rename.
      const isEditing =
        !standalone &&
        !recent &&
        !renameFormDisabled &&
        editingSessionIdentity === sessionIdentity;
      const gitIcon = session.worktree ? (
        <GitForkIcon aria-label={t('sidebar.newWorktreeTask')} />
      ) : session.branch ? (
        <GitBranchIcon aria-label={session.branch.name} />
      ) : null;
      const scheduledTaskMarker = isScheduledTaskSession(session) ? (
        <span
          className={styles.sessionSourceIcon}
          data-web-shell-scheduled-task-session
        >
          <CalendarClockIcon aria-label={t('sidebar.scheduledTasks')} />
        </span>
      ) : null;
      const prBadge = <SessionPrBadge prs={session.prs ?? []} />;
      // The badge is a click target of its own right before the meta slot, so
      // its row keeps the slot at the hover actions' width instead of growing
      // it on hover — growing slid `#N` left and put Pin where it had been.
      const reserveActionsWidth =
        openableSessionPrs(session.prs ?? []).length > 0;
      const withDetails = (row: ReactElement) => (
        <Fragment key={sessionIdentity}>
          {sessionActionItems.has('details') ? (
            <SessionDetailsTooltip
              session={{
                ...session,
                workspaceCwd: getSessionWorkspaceCwd(session),
              }}
              workspaceLabel={
                standalone || recent?.isStandalone
                  ? t('sidebar.noWorkspace')
                  : undefined
              }
              label={label}
              time={time}
              completedUnread={completedUnread}
            >
              {row}
            </SessionDetailsTooltip>
          ) : (
            row
          )}
        </Fragment>
      );
      if (isArchived) {
        const archivedExportWorkspaceCwd =
          getArchivedExportWorkspaceCwd(session);
        const showArchivedExport = standalone
          ? sessionActionItems.has('export')
          : sessionActionItems.has('export') &&
            Boolean(archivedExportWorkspaceCwd);
        const showArchivedUnarchive = standalone
          ? sessionActionItems.has('archive') && Boolean(standalone.onUnarchive)
          : canUnarchiveSession(session);
        const showArchivedDelete = standalone
          ? sessionActionItems.has('delete')
          : canDeleteSession(session);
        const showArchivedRename = standalone
          ? sessionActionItems.has('rename')
          : canRenameSession(session);
        const showArchivedMore = showArchivedRename || showArchivedDelete;
        const archivedActionCount =
          Number(showArchivedExport) +
          Number(showArchivedUnarchive) +
          Number(showArchivedMore);
        return withDetails(
          <div
            className={cx(
              styles.sessionRow,
              styles.archivedRow,
              busy && styles.busySession,
            )}
            onMouseEnter={(event) =>
              measureSessionTitleScroll(event.currentTarget)
            }
          >
            {isEditing ? (
              <SessionRenameEditor
                label={label}
                initialName={
                  renameDraftsRef.current.get(sessionIdentity) ?? label
                }
                onDraftChange={(value) => {
                  renameDraftsRef.current.set(sessionIdentity, value);
                }}
                onCommit={saveRename}
                onCancel={cancelRename}
              />
            ) : (
              <span className={styles.sessionText} data-web-shell-session-title>
                <span className={styles.sessionTextInner}>{label}</span>
              </span>
            )}
            {prBadge}
            <div
              className={cx(
                styles.sessionMetaSlot,
                reserveActionsWidth && styles.sessionMetaSlotReserved,
              )}
              style={
                {
                  '--session-actions-width': `${archivedActionCount * 26}px`,
                } as CSSProperties
              }
            >
              {scheduledTaskMarker}
              {gitIcon && (
                <span className={styles.sessionGitIcon}>{gitIcon}</span>
              )}
              {archivedActionCount > 0 && (
                <div
                  className={styles.sessionActions}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {showArchivedExport && (
                    <button
                      className={styles.sessionActionButton}
                      type="button"
                      disabled={exporting}
                      aria-label={t('sidebar.export')}
                      title={t('sidebar.export')}
                      onClick={() => {
                        if (standalone) standalone.onExport();
                        else handleExportSession(session);
                      }}
                    >
                      <DownloadIcon size={16} strokeWidth={1.2} />
                    </button>
                  )}
                  {showArchivedUnarchive && (
                    <button
                      className={styles.sessionActionButton}
                      type="button"
                      disabled={busy}
                      aria-label={t('sidebar.unarchive')}
                      title={t('sidebar.unarchive')}
                      onClick={() => {
                        if (standalone) standalone.onUnarchive?.();
                        else handleUnarchive(session);
                      }}
                    >
                      <ArchiveRestoreIcon size={16} strokeWidth={1.2} />
                    </button>
                  )}
                  {showArchivedMore && (
                    <SessionMenu onOpenChange={handleSessionMenuOpenChange}>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={styles.sessionActionButton}
                          type="button"
                          aria-label={t('sidebar.moreActions')}
                          title={t('sidebar.moreActions')}
                        >
                          <EllipsisVerticalIcon />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-auto min-w-40"
                        style={SESSION_MENU_PORTAL_STYLE}
                        onPointerDownOutside={
                          handleSessionMenuPointerDownOutside
                        }
                        onCloseAutoFocus={handleSessionMenuCloseAutoFocus}
                      >
                        <DropdownMenuGroup>
                          {showArchivedRename && (
                            <DropdownMenuItem
                              disabled={busy}
                              onSelect={() => {
                                if (standalone) standalone.onRename();
                                else handleRenameFromMenu(session);
                              }}
                            >
                              <PencilIcon />
                              {t('sidebar.rename')}
                            </DropdownMenuItem>
                          )}
                          {showArchivedDelete && (
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={busy}
                              onSelect={() => {
                                if (standalone) standalone.onDelete();
                                else handleDeleteSession(session);
                              }}
                            >
                              <Trash2Icon />
                              {t('sidebar.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </SessionMenu>
                  )}
                </div>
              )}
            </div>
          </div>,
        );
      }

      const isCurrent =
        recent?.isCurrent ?? standalone?.active ?? isCurrentSession(session);
      const rowIdentity =
        standalone || recent?.isStandalone
          ? JSON.stringify(['standalone', session.sessionId])
          : sessionIdentity;
      const isSelected =
        currentSessionActive &&
        isCurrent &&
        (selectedSessionRow?.identity === rowIdentity &&
        (!selectedSessionRow.recent ||
          visibleRecentRowKeys.has(
            JSON.stringify([
              standalone || recent?.isStandalone
                ? undefined
                : getSessionWorkspaceCwd(session),
              session.sessionId,
            ]),
          ))
          ? selectedSessionRow.recent === Boolean(recent)
          : !recent);
      const openRow = () => {
        setPendingRecentCreation(null);
        setSelectedSessionRow({
          identity: rowIdentity,
          recent: Boolean(recent),
        });
        if (
          isCurrent &&
          !connection.error &&
          (standalone || recent?.isStandalone)
        ) {
          onSelectCurrentSession?.();
        } else if (recent) recent.onOpen();
        else if (standalone) standalone.onOpen();
        else handleLoadSession(session.sessionId, session.workspaceCwd);
      };
      const sessionWorkActive =
        !session.hasActivePrompt && session.activeWorkState === 'active';
      // Archiving closes the live session daemon-side, which would end the
      // running work; keep the action visible but inert while it runs.
      const running = Boolean(session.hasActivePrompt || sessionWorkActive);
      const backgroundRunning =
        !session.hasActivePrompt && session.hasRunningBackgroundTasks;
      const needsUserInput =
        !session.isWaitingForPermission && session.isWaitingForUserQuestion;
      const attention = session.isWaitingForPermission
        ? {
            full: t('sidebar.waitingForApproval'),
            short: t('sidebar.waitingForApprovalShort'),
          }
        : needsUserInput
          ? {
              full: t('sidebar.userInputNeeded'),
              short: t('sidebar.userInputNeededShort'),
            }
          : null;
      const showPin = !standalone && canOrganizeSession(session, 'pin');
      const showArchive = standalone
        ? sessionActionItems.has('archive') && Boolean(standalone.onArchive)
        : session.sourceType !== 'qwen-live' &&
          sessionActionItems.has('archive') &&
          canMutateSessionArchive(session);
      const showRename = standalone
        ? sessionActionItems.has('rename')
        : canRenameSession(session);
      const activeExportScope = getActiveExportScope(session);
      const showExport = standalone
        ? sessionActionItems.has('export')
        : sessionActionItems.has('export') && Boolean(activeExportScope);
      const showDelete = standalone
        ? sessionActionItems.has('delete')
        : canShowDeleteSession(session);
      // `showDelete` already applied the workspace-scope gate — standalone rows
      // bypass it on purpose — so the disabled state only carries #12619's rule:
      // the session this client is attached to is deletable once it goes idle.
      // The no-workspace row is the exception: its delete route answers
      // `session_busy` while this tab is still attached, so offering it would be
      // a button that can never succeed. Keep it disabled until the user opens
      // another chat (leaving first, then deleting, is tracked separately).
      const currentStandalone = Boolean(standalone?.active);
      const deleteDisabled =
        busy || currentStandalone || (isCurrent && running);
      const deleteDisabledTitle = currentStandalone
        ? t('sidebar.currentStandaloneDeleteDisabled')
        : isCurrent && running
          ? t('sidebar.currentDeleteDisabled')
          : undefined;
      const showGroup = !standalone && canOrganizeSession(session, 'group');
      // Archived sessions cannot load into a split pane (they leave an empty
      // pane), so the sidebar withholds the split action for them.
      const showSplit =
        !standalone &&
        !isArchived &&
        (session.sourceType === undefined ||
          session.sourceType === WEB_SHELL_SESSION_SOURCE_TYPE) &&
        canOpenSplitView &&
        Boolean(onAddSessionToSplitView) &&
        sessionActionItems.has('split') &&
        canUseWorkspaceQualifiedActions(resolveSessionWorkspaceScope(session));
      const splitAtCapacity =
        (splitSessionIds?.length ?? 0) >= MAX_SPLIT_PANES &&
        !splitSessionIds?.includes(session.sessionId);
      // A pane that is already in the open split: adding it again is a
      // no-op, so offer the same disabled treatment as the capacity case.
      const splitAlreadyOpen = Boolean(
        splitSessionIds?.includes(session.sessionId),
      );
      // Current session with the split closed: the click would seed a
      // one-pane split of the session being viewed — a dead end, so disable
      // it like the archive sibling does for the current session. While the
      // split is open (splitSessionIds set), appending the current session
      // is a legitimate add and stays enabled.
      const splitCurrentDisabled = isCurrent && !splitSessionIds;
      const inlineActionCount =
        Number(showPin && inlineActionItems.has('pin')) +
        Number(showRename && inlineActionItems.has('rename')) +
        Number(showExport && inlineActionItems.has('export')) +
        Number(showDelete && inlineActionItems.has('delete'));
      const showMoreActions =
        showSplit ||
        (showPin && !inlineActionItems.has('pin')) ||
        showArchive ||
        (showRename && !inlineActionItems.has('rename')) ||
        showGroup ||
        (showExport && !inlineActionItems.has('export')) ||
        (showDelete && !inlineActionItems.has('delete'));
      const showDefaultActions =
        !recent &&
        (showSplit ||
          showPin ||
          showArchive ||
          showRename ||
          showExport ||
          showDelete ||
          showGroup);
      const sessionActionCount = recent
        ? 2
        : inlineActionCount + Number(showMoreActions);
      return withDetails(
        <div
          className={cx(
            styles.sessionRow,
            tree &&
              (tree.childCount > 0 || tree.depth > 0) &&
              styles.sessionTreeRow,
            isSelected && styles.currentSession,
            session.isPinned && styles.pinnedSession,
            running && !backgroundRunning && styles.runningSession,
            busy && styles.busySession,
          )}
          data-session-tree-depth={tree ? tree.depth : undefined}
          onMouseEnter={(event) =>
            measureSessionTitleScroll(event.currentTarget)
          }
          onFocus={(event) => measureSessionTitleScroll(event.currentTarget)}
          role="button"
          tabIndex={0}
          aria-current={isSelected ? 'page' : undefined}
          onClick={openRow}
          onDoubleClick={() => {
            if (recent || !showRename) return;
            if (standalone) standalone.onRename();
            else startRename(session);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              openRow();
            }
          }}
        >
          {tree && tree.childCount > 0 && (
            <button
              type="button"
              className={styles.sessionTreeToggle}
              aria-expanded={tree.expanded}
              aria-label={t('sidebar.subSessions', { count: tree.childCount })}
              title={t('sidebar.subSessions', { count: tree.childCount })}
              onClick={(event) => {
                event.stopPropagation();
                tree.onToggle();
              }}
              // Enter/Space on this button must not reach the row's own
              // keydown, which opens the session: one keypress would both
              // toggle the tree and navigate away.
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                }
              }}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              {tree.expanded ? (
                <ChevronDownIcon size={12} />
              ) : (
                <ChevronRightIcon size={12} />
              )}
            </button>
          )}
          <span className={styles.sessionStatusSlot}>
            {liveStarting ? (
              <LoaderCircleIcon
                className={styles.liveSessionSpinner}
                aria-label={t('live.state.starting')}
                data-live-starting-session
              />
            ) : null}
            {!liveStarting && completedUnread && !backgroundRunning ? (
              <span
                className={styles.sessionStatusDot}
                data-web-shell-session-completed-unread
                aria-hidden="true"
              />
            ) : null}
            {!liveStarting && backgroundRunning && (
              <span
                className={cx(
                  styles.sessionStatusDot,
                  styles.sessionBackgroundRunning,
                )}
                data-web-shell-session-background-running
                role="img"
                aria-label={t('background.running')}
                title={t('background.running')}
              />
            )}
            {!liveStarting && session.hasActivePrompt && !completedUnread ? (
              <span
                className={cx(
                  styles.sessionStatusDot,
                  styles.sessionStatusDotRunning,
                )}
                data-web-shell-session-running
                aria-hidden="true"
              />
            ) : !liveStarting &&
              sessionWorkActive &&
              !completedUnread &&
              !backgroundRunning ? (
              <span
                className={styles.sessionStatusDot}
                data-web-shell-session-active-work
                aria-hidden="true"
              />
            ) : null}
          </span>
          {isEditing && showRename ? (
            <SessionRenameEditor
              label={label}
              initialName={
                renameDraftsRef.current.get(sessionIdentity) ?? label
              }
              onDraftChange={(value) => {
                renameDraftsRef.current.set(sessionIdentity, value);
              }}
              onCommit={saveRename}
              onCancel={cancelRename}
            />
          ) : (
            <>
              <span className={styles.sessionText} data-web-shell-session-title>
                <span className={styles.sessionTextInner}>{label}</span>
                {searchSnippet && (
                  <span className={styles.sessionSearchSnippet}>
                    {searchSnippet}
                  </span>
                )}
              </span>
              {prBadge}
              <div
                className={cx(
                  styles.sessionMetaSlot,
                  reserveActionsWidth && styles.sessionMetaSlotReserved,
                )}
                // Always set, so a row without actions does not grow to the
                // stylesheet's fallback width on hover.
                style={
                  {
                    '--session-actions-width': `${sessionActionCount * 26}px`,
                  } as CSSProperties
                }
              >
                {scheduledTaskMarker}
                {attention && (
                  <span
                    className={cx(
                      styles.sessionAttention,
                      needsUserInput && styles.sessionAttentionUserInput,
                    )}
                    aria-label={attention.full}
                  >
                    {attention.short}
                  </span>
                )}
                {running && !backgroundRunning ? (
                  <span
                    className={styles.sessionLoading}
                    aria-label={
                      sessionWorkActive
                        ? t('sidebar.activeWork')
                        : t('sidebar.running')
                    }
                  />
                ) : !attention && gitIcon ? (
                  <span className={styles.sessionGitIcon}>{gitIcon}</span>
                ) : null}
                {recent && (
                  <div
                    className={styles.sessionActions}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {recent.actions}
                  </div>
                )}
                {showDefaultActions && (
                  <div
                    className={styles.sessionActions}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {(() => {
                      const inlineActions: Array<{
                        key: WebShellSidebarSessionInlineActionItem;
                        icon?: ReactNode;
                        label: string;
                        disabled?: boolean;
                        title?: string;
                        active?: boolean;
                        destructive?: boolean;
                        visible: boolean;
                        onClick: () => void;
                      }> = [
                        {
                          key: 'pin',
                          icon: <PinIcon size={16} strokeWidth={1.2} />,
                          label: session.isPinned
                            ? t('sidebar.unpin')
                            : t('sidebar.pin'),
                          disabled: busy,
                          active: session.isPinned,
                          visible: showPin && inlineActionItems.has('pin'),
                          onClick: () => handleTogglePin(session),
                        },
                        {
                          key: 'rename',
                          icon: <PencilIcon size={16} strokeWidth={1.2} />,
                          label: t('sidebar.rename'),
                          disabled: busy,
                          visible:
                            showRename && inlineActionItems.has('rename'),
                          onClick: () => {
                            if (standalone) standalone.onRename();
                            else handleRenameFromMenu(session);
                          },
                        },
                        {
                          key: 'export',
                          icon: <DownloadIcon size={16} strokeWidth={1.2} />,
                          label: t('sidebar.export'),
                          disabled: exporting,
                          visible:
                            showExport && inlineActionItems.has('export'),
                          onClick: () => {
                            if (standalone) standalone.onExport();
                            else handleExportSession(session);
                          },
                        },
                        {
                          key: 'delete',
                          icon: <Trash2Icon size={16} strokeWidth={1.2} />,
                          label: t('sidebar.delete'),
                          disabled: deleteDisabled,
                          destructive: true,
                          title: deleteDisabledTitle,
                          visible:
                            showDelete && inlineActionItems.has('delete'),
                          onClick: () => {
                            if (standalone) standalone.onDelete();
                            else handleDeleteSession(session);
                          },
                        },
                      ];
                      return inlineActions
                        .filter((a) => a.visible)
                        .map((action) => (
                          <button
                            key={action.key}
                            className={cx(
                              styles.sessionActionButton,
                              action.active && styles.activeSessionActionButton,
                            )}
                            type="button"
                            disabled={action.disabled}
                            aria-label={action.label}
                            title={action.title ?? action.label}
                            onClick={action.onClick}
                            style={
                              action.destructive && !action.disabled
                                ? {
                                    color: 'var(--destructive, #dc2626)',
                                  }
                                : undefined
                            }
                          >
                            {action.icon ?? (
                              <span style={{ fontSize: 12 }}>
                                {action.label}
                              </span>
                            )}
                          </button>
                        ));
                    })()}
                    {showMoreActions ? (
                      <SessionMenu onOpenChange={handleSessionMenuOpenChange}>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={styles.sessionActionButton}
                            type="button"
                            aria-label={t('sidebar.moreActions')}
                            title={t('sidebar.moreActions')}
                          >
                            <EllipsisVerticalIcon />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-auto min-w-40"
                          style={SESSION_MENU_PORTAL_STYLE}
                          onPointerDownOutside={
                            handleSessionMenuPointerDownOutside
                          }
                          onCloseAutoFocus={handleSessionMenuCloseAutoFocus}
                        >
                          <DropdownMenuGroup>
                            {showSplit && (
                              <DropdownMenuItem
                                disabled={
                                  busy ||
                                  splitAtCapacity ||
                                  splitAlreadyOpen ||
                                  splitCurrentDisabled
                                }
                                title={
                                  splitAtCapacity
                                    ? t('sidebar.splitAtCapacity', {
                                        max: MAX_SPLIT_PANES,
                                      })
                                    : splitAlreadyOpen
                                      ? t('sidebar.splitAlreadyOpen')
                                      : splitCurrentDisabled
                                        ? t('sidebar.splitCurrentDisabled')
                                        : undefined
                                }
                                onSelect={() =>
                                  onAddSessionToSplitView?.(session.sessionId)
                                }
                              >
                                <Columns2Icon />
                                {t('sidebar.addToSplitView')}
                              </DropdownMenuItem>
                            )}
                            {showPin && !inlineActionItems.has('pin') && (
                              <DropdownMenuItem
                                disabled={busy}
                                onSelect={() => handleTogglePin(session)}
                              >
                                <PinIcon />
                                {session.isPinned
                                  ? t('sidebar.unpin')
                                  : t('sidebar.pin')}
                              </DropdownMenuItem>
                            )}
                            {showArchive && (
                              <DropdownMenuItem
                                disabled={busy || isCurrent || running}
                                title={
                                  isCurrent
                                    ? t('sidebar.archiveCurrentDisabled')
                                    : running
                                      ? t('sidebar.archiveRunningDisabled')
                                      : undefined
                                }
                                onSelect={() => {
                                  if (standalone) standalone.onArchive?.();
                                  else handleArchive(session);
                                }}
                              >
                                <ArchiveIcon />
                                {t('sidebar.archive')}
                              </DropdownMenuItem>
                            )}
                            {showRename && !inlineActionItems.has('rename') && (
                              <DropdownMenuItem
                                disabled={busy}
                                onSelect={() => {
                                  if (standalone) standalone.onRename();
                                  else handleRenameFromMenu(session);
                                }}
                              >
                                <PencilIcon />
                                {t('sidebar.rename')}
                              </DropdownMenuItem>
                            )}
                            {showGroup && (
                              <DropdownMenuItem
                                disabled={busy}
                                onSelect={(event) =>
                                  openGroupMenuFromAnchor(
                                    event.currentTarget as HTMLElement,
                                    session,
                                  )
                                }
                              >
                                <FolderInputIcon />
                                {t('sidebar.sessionGroup')}
                              </DropdownMenuItem>
                            )}
                            {showExport && !inlineActionItems.has('export') && (
                              <DropdownMenuItem
                                disabled={exporting}
                                onSelect={() => {
                                  if (standalone) standalone.onExport();
                                  else handleExportSession(session);
                                }}
                              >
                                <DownloadIcon />
                                {t('sidebar.export')}
                              </DropdownMenuItem>
                            )}
                            {showDelete && !inlineActionItems.has('delete') && (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={deleteDisabled}
                                title={deleteDisabledTitle}
                                onSelect={() => {
                                  if (standalone) standalone.onDelete();
                                  else handleDeleteSession(session);
                                }}
                              >
                                <Trash2Icon />
                                {t('sidebar.delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </SessionMenu>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
      );
    },
    [
      busySessionIds,
      canDeleteSession,
      canShowDeleteSession,
      canOrganizeSession,
      canRenameSession,
      canUnarchiveSession,
      canMutateSessionArchive,
      canOpenSplitView,
      canUseWorkspaceQualifiedActions,
      cancelRename,
      completedUnreadIds,
      contentSearchHits,
      editingSessionIdentity,
      exportingSessionIds,
      getArchivedExportWorkspaceCwd,
      getActiveExportScope,
      getIdentityForSession,
      getSessionWorkspaceCwd,
      handleArchive,
      handleDeleteSession,
      handleExportSession,
      handleLoadSession,
      handleRenameFromMenu,
      handleSessionMenuCloseAutoFocus,
      handleSessionMenuOpenChange,
      handleSessionMenuPointerDownOutside,
      handleTogglePin,
      handleUnarchive,
      isCurrentSession,
      selectedSessionRow,
      visibleRecentRowKeys,
      connection.error,
      onSelectCurrentSession,
      openGroupMenuFromAnchor,
      currentSessionActive,
      onAddSessionToSplitView,
      resolveSessionWorkspaceScope,
      saveRename,
      searchQuery,
      sessionActionItems,
      inlineActionItems,
      livePresence,
      startRename,
      splitSessionIds,
      t,
    ],
  );

  // The Pinned section is not rendered in Live or Channels; a host check
  // that ignored that would let an off-screen Pinned row disable the reveal
  // guard for a row that is actually truncated.
  const pinnedSectionVisible = useMemo(
    () =>
      !liveView &&
      selectedSessionSource !== 'channel' &&
      pinnedSessions.length > 0,
    [liveView, pinnedSessions, selectedSessionSource],
  );
  // When the Pinned section hosts the editor, the row is already mounted
  // there and a catalog's copy is `renameFormDisabled`; expanding that
  // catalog would only add rows nobody is editing. Shared with the
  // WorkspaceSection prop below so both reveal paths use one rule.
  const pinnedSectionHostsEditing = useMemo(
    () =>
      pinnedSectionVisible &&
      editingSessionIdentity !== null &&
      pinnedExpanded &&
      pinnedSessions.some(
        (session) => getIdentityForSession(session) === editingSessionIdentity,
      ),
    [
      editingSessionIdentity,
      getIdentityForSession,
      pinnedExpanded,
      pinnedSectionVisible,
      pinnedSessions,
    ],
  );
  const editingSessionIdForSections = pinnedSectionHostsEditing
    ? undefined
    : editingSession?.sessionId;

  const buildSessionTreeRows = useCallback(
    (treeSessions: readonly DaemonSessionSummary[]) => {
      const rows = sessionTree.buildRows(treeSessions);
      return {
        rows,
        nodes: rows.map((row) => (
          <Fragment key={row.session.sessionId}>
            {renderSessionRow(row.session, {
              tree: sessionTree.renderOptions(row),
            })}
          </Fragment>
        )),
      };
    },
    [renderSessionRow, sessionTree],
  );

  const body = useMemo(() => {
    // Rename only has to reveal the edited row. Expanding the whole catalog —
    // or even the whole section — mounted hundreds of rows exactly when the
    // rename editor opened, which is what made typing lag.
    const editingSessionBeyondPreview = (
      items: readonly DaemonSessionSummary[],
    ): boolean =>
      !pinnedSectionHostsEditing &&
      editingSessionIdentity !== null &&
      items.findIndex(
        (session) => getIdentityForSession(session) === editingSessionIdentity,
      ) >= SIDEBAR_SESSION_PREVIEW_LIMIT;
    const renderFlatSessions = () => {
      const showAll =
        showAllProjectSessions ||
        Boolean(searchQuery.trim()) ||
        editingSessionBeyondPreview(filteredSessions);
      const treeRows = sessionTree.buildRows(filteredSessions);
      const displayedRows = showAll
        ? treeRows
        : treeRows.slice(0, SIDEBAR_SESSION_PREVIEW_LIMIT);
      return (
        <>
          {displayedRows.map((row) => (
            <Fragment key={row.session.sessionId}>
              {renderSessionRow(row.session, {
                tree: sessionTree.renderOptions(row),
              })}
            </Fragment>
          ))}
          {!showAll && treeRows.length > SIDEBAR_SESSION_PREVIEW_LIMIT && (
            <button
              type="button"
              className={styles.showAllSessions}
              onClick={() => setShowAllProjectSessions(true)}
            >
              {t('sidebar.showAllSessions')}
            </button>
          )}
        </>
      );
    };
    // Gate notices on the resource, not the filtered view: background
    // refreshes set loading/error while retaining the settled page, so a
    // filter-empty or empty-but-settled view must not flash or swap to retry.
    if (loading && sessionsPage === undefined) {
      return null;
    }
    if (error && sessionsPage === undefined) {
      return (
        <button
          className={styles.retry}
          type="button"
          onClick={() => void reload({ interactive: true })}
        >
          {t('sidebar.loadFailed')}
        </button>
      );
    }
    if (
      filteredSessions.length === 0 &&
      (selectedSessionSource === 'channel' ||
        channelSessionSections !== null ||
        !organizationEnabled ||
        sessionSections.length === 0)
    ) {
      return <div className={styles.notice}>{t('sidebar.noSessions')}</div>;
    }
    if (channelSessionSections) {
      return channelSessionSections.map((section) => {
        const tree = buildSessionTreeRows(section.sessions);
        return (
          <SessionGroupSection
            key={section.id}
            id={section.id}
            label={section.label}
            count={tree.rows.length}
            limitSessions={
              !editingSessionBeyondPreview(section.sessions) &&
              !searchQuery.trim()
            }
            expanded={!collapsedSessionSectionIds.has(section.id)}
            onToggle={() => toggleSessionSection(section.id)}
          >
            {tree.nodes}
          </SessionGroupSection>
        );
      });
    }
    if (selectedSessionSource === 'channel') {
      return renderFlatSessions();
    }
    if (sessionSections.length === 0) {
      return renderFlatSessions();
    }

    return sessionSections.map((section) => {
      const expanded = !collapsedSessionSectionIds.has(section.id);
      const group = section.group;
      const tree = buildSessionTreeRows(section.sessions);
      return (
        <SessionGroupSection
          key={section.id}
          id={section.id}
          label={section.label}
          count={tree.rows.length}
          color={section.color}
          icon={
            section.kind === 'scheduled-task' ? (
              <CalendarClockIcon data-web-shell-scheduled-task-group />
            ) : undefined
          }
          limitSessions={
            !editingSessionBeyondPreview(section.sessions) &&
            !searchQuery.trim()
          }
          expanded={expanded}
          onToggle={() => toggleSessionSection(section.id)}
          onRename={
            section.kind === 'group' && group && canOrganizeWorkspace()
              ? () => handleRenameGroup(group)
              : undefined
          }
          onDelete={
            section.kind === 'group' && group && canOrganizeWorkspace()
              ? () => handleDeleteGroup(group)
              : undefined
          }
          renameLabel={t('sidebar.groupRename')}
          deleteLabel={t('sidebar.groupDelete')}
          actionsDisabled={groupBusy}
        >
          {tree.rows.map((row) => (
            <Fragment key={row.session.sessionId}>
              {renderSessionRow(row.session, {
                tree: sessionTree.renderOptions(row),
                // Pinned members also render in the Pinned section; while that
                // section is expanded its row hosts the rename form, so this
                // duplicate row must not mount a second autofocused input.
                // Gate on the Pinned section actually carrying the row —
                // content-search ghosts never appear there, so without the
                // membership check no row would host the form at all and
                // rename would be silently inoperable for them.
                renameFormDisabled:
                  Boolean(row.session.isPinned) &&
                  pinnedExpanded &&
                  pinnedSessions.some(
                    (candidate) =>
                      getIdentityForSession(candidate) ===
                      getIdentityForSession(row.session),
                  ),
              })}
            </Fragment>
          ))}
        </SessionGroupSection>
      );
    });
  }, [
    collapsedSessionSectionIds,
    canOrganizeWorkspace,
    channelSessionSections,
    editingSessionIdentity,
    error,
    filteredSessions,
    getIdentityForSession,
    groupBusy,
    handleDeleteGroup,
    handleRenameGroup,
    loading,
    organizationEnabled,
    pinnedExpanded,
    pinnedSessions,
    pinnedSectionHostsEditing,
    buildSessionTreeRows,
    reload,
    renderSessionRow,
    sessionTree,
    searchQuery,
    selectedSessionSource,
    sessionSections,
    sessionsPage,
    showAllProjectSessions,
    t,
    toggleSessionSection,
  ]);

  const standaloneSessionsVisible = Boolean(
    !sectionView &&
      workspace.capabilities?.features?.includes(
        STANDALONE_SESSIONS_CAPABILITY,
      ) === true &&
      !lockedWorkspaceCwd &&
      onLoadStandaloneSession &&
      onStandaloneNotice,
  );
  const archivedStandaloneSessionsVisible =
    standaloneSessionsVisible && archiveSourceType !== 'channel';
  const handleStandaloneMutation = useCallback(() => {
    setStandaloneRefreshKey((value) => value + 1);
  }, []);
  const handleArchiveRecentStandalone = useCallback(
    (session: DaemonSessionSummary) => {
      if (
        !sessionActionItems.has('archive') ||
        session.sessionId === connection.sessionId ||
        session.hasActivePrompt ||
        session.activeWorkState === 'active' ||
        busySessionIdsRef.current.has(getIdentityForSession(session))
      )
        return;
      setSessionBusy(session.sessionId, true, session.workspaceCwd);
      void (async () => {
        try {
          const result = await workspace.client.archiveStandaloneSessions([
            session.sessionId,
          ]);
          if (
            !result.archived.includes(session.sessionId) &&
            !result.alreadyArchived.includes(session.sessionId) &&
            !result.notFound?.includes(session.sessionId)
          ) {
            throw new Error(
              result.errors.find(
                (entry) => entry.sessionId === session.sessionId,
              )?.message ?? t('sidebar.archiveFailed'),
            );
          }
          handleStandaloneMutation();
        } catch (error) {
          onError(error, t('sidebar.archiveFailed'));
        } finally {
          setSessionBusy(session.sessionId, false, session.workspaceCwd);
        }
      })();
    },
    [
      connection.sessionId,
      getIdentityForSession,
      handleStandaloneMutation,
      onError,
      setSessionBusy,
      sessionActionItems,
      t,
      workspace.client,
    ],
  );
  const handleStandaloneArchivedStatus = useCallback(
    (status: { count: number; loading: boolean; error: boolean }) => {
      setStandaloneArchivedStatus(status);
    },
    [],
  );
  const archivedWorkspaceGroups = useMemo(() => {
    const byCwd = new Map<string, DaemonSessionSummary[]>();
    for (const session of allArchivedSessions) {
      const cwd = getSessionWorkspaceCwd(session);
      const current = byCwd.get(cwd) ?? [];
      current.push(session);
      byCwd.set(cwd, current);
    }
    return [...byCwd].map(([cwd, sessions]) => {
      return {
        cwd,
        label: cwd
          ? workspaceLabelForCwd(cwd, projectWorkspaces)
          : t('sidebar.projectFallback'),
        sessions,
      };
    });
  }, [allArchivedSessions, getSessionWorkspaceCwd, projectWorkspaces, t]);

  const archivedSection = useMemo(() => {
    if (
      (!sessionArchiveEnabled &&
        !standaloneSessionsVisible &&
        managedArchivedSessions === undefined) ||
      !archivedSessionsTarget
    ) {
      return null;
    }

    const archivedCount =
      allArchivedSessions.length +
      (archivedStandaloneSessionsVisible ? standaloneArchivedStatus.count : 0) +
      (managedArchivedSessions?.count ?? 0);
    const archivedLoadingWithStandalone =
      effectiveArchivedLoading ||
      (archivedStandaloneSessionsVisible && standaloneArchivedStatus.loading) ||
      managedArchivedSessions?.loading;
    const archivedErrorWithStandalone =
      effectiveArchivedError ||
      (archivedStandaloneSessionsVisible && standaloneArchivedStatus.error);

    const retry = (
      <button
        className={styles.retry}
        type="button"
        onClick={() => {
          void reloadArchived({ interactive: true }).catch(() => undefined);
          setStandaloneRefreshKey((value) => value + 1);
          for (const workspaceCwd of secondaryWorkspaceCwds) {
            sessionCatalogController.refreshWorkspace(workspaceCwd);
          }
        }}
      >
        {t('sidebar.loadFailed')}
      </button>
    );
    let notice: ReactNode;
    if (
      !archivedLoadingWithStandalone &&
      archivedErrorWithStandalone &&
      archivedCount === 0
    ) {
      notice = retry;
    } else if (
      !archivedLoadingWithStandalone &&
      archivedCount === 0 &&
      !managedArchivedSessions?.error
    ) {
      notice = (
        <div className={styles.notice}>{t('sidebar.archivedEmpty')}</div>
      );
    }

    const content = (
      <>
        {showSessionSourceSwitch && sourceMetadataEnabled && (
          <Tabs
            className="px-2 pb-2"
            value={archiveSessionSource}
            onValueChange={(value) =>
              setArchiveSessionSource(value as SidebarSessionSource)
            }
          >
            <TabsList
              className="w-full"
              aria-label={t('sidebar.archiveSessionSource')}
            >
              <TabsTrigger value="default" className="min-w-0">
                <ListTodoIcon />
                <span className="min-w-0 truncate">
                  {t('sidebar.sessionSource.tasks')}
                </span>
              </TabsTrigger>
              <TabsTrigger value="channel" className="min-w-0">
                <MessageCircleIcon />
                <span className="min-w-0 truncate">
                  {t('sidebar.sessionSource.channels')}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {managedArchivedSessions?.content}
        {archivedStandaloneSessionsVisible &&
          onLoadStandaloneSession &&
          onStandaloneNotice && (
            <StandaloneRecents
              archiveState="archived"
              currentSessionId={connection.sessionId}
              currentSessionReady={
                connection.status === 'connected' &&
                !connection.error &&
                !connection.loadingTranscript &&
                !connection.catchingUp
              }
              refreshKey={standaloneRefreshKey}
              renderSession={(session, standalone) =>
                renderSessionRow(session, {
                  isArchived: standalone.isArchived,
                  standalone,
                })
              }
              onLoadSession={onLoadStandaloneSession}
              onRenameSession={(sessionId, displayName) =>
                onSessionRenameConfirmed?.(undefined, sessionId, displayName)
              }
              onMutated={handleStandaloneMutation}
              onStatusChange={handleStandaloneArchivedStatus}
              onError={onError}
              onNotice={onStandaloneNotice}
            />
          )}
        {notice}
        {archivedWorkspaceGroups.map((group) => (
          <section
            key={group.cwd}
            className="mb-3"
            aria-label={`${t('sidebar.archivedTitle')}: ${group.label}`}
          >
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <FolderClosedIcon
                size={16}
                strokeWidth={1.4}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
            </div>
            {group.sessions.map((session) =>
              renderSessionRow(session, { isArchived: true }),
            )}
          </section>
        ))}
        {archivedCount > 0 && archivedErrorWithStandalone && retry}
      </>
    );

    return createPortal(
      <div className={styles.archivedList}>{content}</div>,
      archivedSessionsTarget,
    );
  }, [
    archivedSessionsTarget,
    archivedWorkspaceGroups,
    archiveSessionSource,
    showSessionSourceSwitch,
    sourceMetadataEnabled,
    allArchivedSessions,
    connection.catchingUp,
    connection.error,
    connection.loadingTranscript,
    connection.sessionId,
    connection.status,
    effectiveArchivedError,
    effectiveArchivedLoading,
    handleStandaloneArchivedStatus,
    handleStandaloneMutation,
    managedArchivedSessions,
    onError,
    onLoadStandaloneSession,
    onSessionRenameConfirmed,
    onStandaloneNotice,
    reloadArchived,
    renderSessionRow,
    secondaryWorkspaceCwds,
    sessionCatalogController,
    sessionArchiveEnabled,
    standaloneArchivedStatus,
    standaloneRefreshKey,
    archivedStandaloneSessionsVisible,
    standaloneSessionsVisible,
    t,
  ]);
  const primaryNavigation = hasScrollingPrimaryNav && (
    <div className={styles.primaryNav}>
      {projectFeaturesEnabled &&
        onOpenAgents &&
        primaryNavItems.has('agents') && (
          <button
            className={styles.pluginButton}
            type="button"
            title={railLayout ? undefined : t('agents.title')}
            aria-label={t('agents.title')}
            onClick={() => openNavigation(() => onOpenAgents('agents'))}
          >
            <span className={styles.navIcon}>
              <BotIcon size={16} strokeWidth={1.2} />
            </span>
            {!collapsed && !railLayout && <span>{t('agents.title')}</span>}
          </button>
        )}
      {projectFeaturesEnabled && primaryNavItems.has('plugins') && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('sidebar.plugins')}
          aria-label={t('sidebar.plugins')}
          aria-current={
            railLayout && activePage === 'plugins' ? 'page' : undefined
          }
          onClick={() => openNavigation(onOpenPlugins)}
        >
          <span className={styles.navIcon}>
            <BlocksIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && <span>{t('sidebar.plugins')}</span>}
        </button>
      )}
      {projectFeaturesEnabled && primaryNavItems.has('channels') && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('sidebar.channels')}
          aria-label={t('sidebar.channels')}
          aria-current={
            railLayout && activePage === 'channels' ? 'page' : undefined
          }
          onClick={() =>
            openNavigation(onOpenChannels, channelNavigationEnabled)
          }
        >
          <span className={styles.navIcon}>
            <MessagesSquareIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && <span>{t('sidebar.channels')}</span>}
        </button>
      )}
      {channelEventsNavigationEnabled && onOpenChannelEvents && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('sidebar.channelEvents')}
          aria-label={t('sidebar.channelEvents')}
          aria-current={
            railLayout && activePage === 'channel-events' ? 'page' : undefined
          }
          onClick={() =>
            openNavigation(onOpenChannelEvents, channelEventsNavigationEnabled)
          }
        >
          <span className={styles.navIcon}>
            <ActivityIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && (
            <span>{t('sidebar.channelEvents')}</span>
          )}
        </button>
      )}
      {liveNavigationEnabled && onOpenLive && (
        <button
          className={styles.pluginButton}
          type="button"
          aria-label={t('sidebar.live')}
          aria-current={activePage === 'live' ? 'page' : undefined}
          onClick={() => openNavigation(onOpenLive, true)}
        >
          <span className={styles.navIcon}>
            <AudioLinesIcon size={17} strokeWidth={1.8} />
          </span>
        </button>
      )}
      {projectFeaturesEnabled && primaryNavItems.has('scheduledTasks') && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('sidebar.scheduledTasks')}
          aria-label={t('sidebar.scheduledTasks')}
          aria-current={
            railLayout && activePage === 'scheduledTasks' ? 'page' : undefined
          }
          onClick={() => openNavigation(onOpenScheduledTasks)}
        >
          <span className={styles.navIcon}>
            <CalendarClockIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && (
            <span>{t('sidebar.scheduledTasks')}</span>
          )}
        </button>
      )}
      {projectFeaturesEnabled &&
        primaryNavItems.has('prWatches') &&
        onOpenPrWatches && (
          <button
            className={styles.pluginButton}
            type="button"
            title={railLayout ? undefined : t('sidebar.prWatches')}
            aria-label={t('sidebar.prWatches')}
            aria-current={
              railLayout && activePage === 'prWatches' ? 'page' : undefined
            }
            onClick={() => openNavigation(onOpenPrWatches)}
          >
            <span className={styles.navIcon}>
              <GitPullRequestIcon size={16} strokeWidth={1.2} />
            </span>
            {!collapsed && !railLayout && <span>{t('sidebar.prWatches')}</span>}
          </button>
        )}
      {projectFeaturesEnabled &&
        primaryNavItems.has('workflows') &&
        workflowsEnabled && (
          <button
            className={styles.pluginButton}
            type="button"
            title={railLayout ? undefined : t('sidebar.workflows')}
            aria-label={t('sidebar.workflows')}
            aria-current={
              railLayout && activePage === 'workflows' ? 'page' : undefined
            }
            onClick={() => openNavigation(onOpenWorkflows)}
          >
            <span className={styles.navIcon}>
              <WorkflowIcon size={16} strokeWidth={1.2} />
            </span>
            {!collapsed && !railLayout && <span>{t('sidebar.workflows')}</span>}
          </button>
        )}
      {projectFeaturesEnabled && primaryNavItems.has('goals') && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('sidebar.goals')}
          aria-label={t('sidebar.goals')}
          aria-current={
            railLayout && activePage === 'goals' ? 'page' : undefined
          }
          onClick={() => openNavigation(onOpenGoals)}
        >
          <span className={styles.navIcon}>
            <TargetIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && <span>{t('sidebar.goals')}</span>}
        </button>
      )}
      {primaryNavItems.has('managed') && onOpenManagedSessions && (
        <button
          className={styles.pluginButton}
          type="button"
          title={railLayout ? undefined : t('managed.title')}
          aria-label={t('managed.title')}
          aria-current={
            railLayout && activePage === 'managed' ? 'page' : undefined
          }
          onClick={() => openNavigation(onOpenManagedSessions)}
        >
          <span className={styles.navIcon}>
            <BotIcon size={16} strokeWidth={1.2} />
          </span>
          {!collapsed && !railLayout && <span>{t('managed.title')}</span>}
        </button>
      )}
      {!railLayout && primaryNavOptions?.render?.()}
    </div>
  );
  const collapseControl = (mobileOpen || footerItems.has('collapse')) && (
    <button
      className={styles.collapseButton}
      data-web-shell-sidebar-collapse
      type="button"
      title={
        railLayout
          ? undefined
          : mobileOpen || navigationExpanded
            ? t('sidebar.collapse')
            : t('sidebar.expand')
      }
      aria-label={
        mobileOpen || navigationExpanded
          ? t('sidebar.collapse')
          : t('sidebar.expand')
      }
      onClick={() =>
        mobileOpen ? onMobileClose?.() : onCollapsedChange(navigationExpanded)
      }
    >
      {!navigationExpanded && !mobileOpen ? (
        <PanelLeftOpenIcon size={16} strokeWidth={1.2} />
      ) : (
        <PanelLeftCloseIcon size={16} strokeWidth={1.2} />
      )}
    </button>
  );
  const footerContent = (footer !== false || mobileOpen) && (
    <div
      className={cx(
        styles.footer,
        !railLayout && footerCompact && styles.footerCompact,
      )}
    >
      <div className={styles.footerVersion}>
        {(railLayout || !collapsed) &&
          versionLabel &&
          footerItems.has('version') && (
            <span
              className={styles.version}
              title={`${brandName} ${versionLabel}`}
            >
              {versionLabel}
            </span>
          )}
        {railLayout ? (
          <div ref={setUpdateSlot} />
        ) : (
          showUpdate && (
            <UpdateControl
              client={workspace.client}
              collapsed={collapsed && !mobileOpen}
              currentVersion={qwenCodeVersion}
              onError={onError}
            />
          )
        )}
      </div>
      <div className={styles.footerPrimary}>
        {!railLayout &&
          footer &&
          typeof footer === 'object' &&
          footer.render?.()}
        {(canOpenSettings ?? projectFeaturesEnabled) &&
          footerItems.has('settings') && (
            <button
              className={styles.footerButton}
              type="button"
              title={t('sidebar.settings')}
              aria-label={t('sidebar.settings')}
              aria-current={
                railLayout && activePage === 'settings' ? 'page' : undefined
              }
              onClick={() => openNavigation(onOpenSettings)}
            >
              <span className={`${styles.navIcon} ${styles.settingsIcon}`}>
                <SettingsIcon size={16} strokeWidth={1.2} />
              </span>
              {(railLayout || (!collapsed && !footerCompact)) && (
                <span className={styles.footerButtonLabel}>
                  {t('sidebar.settings')}
                </span>
              )}
            </button>
          )}
      </div>
      <div className={styles.footerActions}>
        {footerItems.has('theme') && (
          <button
            className={styles.collapseButton}
            type="button"
            title={
              theme === WebShellThemeId.Dark
                ? t('sidebar.themeLight')
                : t('sidebar.themeDark')
            }
            aria-label={
              theme === WebShellThemeId.Dark
                ? t('sidebar.themeLight')
                : t('sidebar.themeDark')
            }
            onClick={() => {
              onThemeChange(
                theme === WebShellThemeId.Dark
                  ? WebShellThemeId.Light
                  : WebShellThemeId.Dark,
              );
              setMoreOpen(false);
            }}
          >
            {theme === WebShellThemeId.Dark ? (
              <SunIcon size={16} strokeWidth={1.2} />
            ) : (
              <MoonIcon size={16} strokeWidth={1.2} />
            )}
            {railLayout && (
              <span>
                {t(
                  theme === WebShellThemeId.Dark
                    ? 'sidebar.themeLight'
                    : 'sidebar.themeDark',
                )}
              </span>
            )}
          </button>
        )}
        {projectFeaturesEnabled &&
          canOpenSessionsOverview &&
          footerItems.has('sessionsOverview') && (
            <button
              className={styles.collapseButton}
              type="button"
              title={t('sidebar.sessionsOverview')}
              aria-label={t('sidebar.sessionsOverview')}
              aria-current={
                railLayout && activePage === 'sessions' ? 'page' : undefined
              }
              onClick={() => openNavigation(onOpenSessions)}
            >
              <LayoutGridIcon size={16} strokeWidth={1.2} />
              {railLayout && <span>{t('sidebar.sessionsOverview')}</span>}
            </button>
          )}
        {!sectionView &&
          onOpenWorkspacesOverview &&
          !lockedWorkspaceCwd &&
          footerItems.has('workspacesOverview') && (
            <button
              className={styles.collapseButton}
              type="button"
              data-testid="footer-workspaces-overview"
              title={t('sidebar.manageWorkspaces')}
              aria-label={t('sidebar.manageWorkspaces')}
              aria-current={
                railLayout && activePage === 'workspaces' ? 'page' : undefined
              }
              onClick={() => openNavigation(onOpenWorkspacesOverview)}
            >
              <FolderKanbanIcon size={16} strokeWidth={1.2} />
              {railLayout && <span>{t('sidebar.manageWorkspaces')}</span>}
            </button>
          )}
        {projectFeaturesEnabled &&
          canOpenSplitView &&
          footerItems.has('splitView') && (
            <button
              className={styles.collapseButton}
              type="button"
              title={t('sidebar.splitView')}
              aria-label={t('sidebar.splitView')}
              aria-current={
                railLayout && activePage === 'split' ? 'page' : undefined
              }
              onClick={() => openNavigation(onOpenSplitView)}
            >
              <Columns2Icon size={16} strokeWidth={1.2} />
              {railLayout && <span>{t('sidebar.splitView')}</span>}
            </button>
          )}
        {footerItems.has('daemonStatus') && (
          <button
            className={styles.collapseButton}
            type="button"
            title={t('sidebar.daemonStatus')}
            aria-label={t('sidebar.daemonStatus')}
            aria-current={
              railLayout && activePage === 'status' ? 'page' : undefined
            }
            onClick={() => openNavigation(onOpenDaemonStatus)}
          >
            <ActivityIcon size={16} strokeWidth={1.2} />
            {railLayout && <span>{t('sidebar.daemonStatus')}</span>}
          </button>
        )}
        {railLayout ? (
          <div ref={setLocalFilesSlot} />
        ) : footerItems.has('localFiles') &&
          isPageOriginDaemon(workspace.baseUrl) ? (
          <LocalFilesControl
            triggerClassName={styles.collapseButton}
            workspaces={workspaces}
          />
        ) : null}
        {railLayout ? (
          <div ref={setDesktopRelaySlot} />
        ) : footerItems.has('desktopRelay') &&
          isPageOriginDaemon(workspace.baseUrl) ? (
          <DesktopRelayControl
            triggerClassName={styles.collapseButton}
            workspaces={workspaces}
            showWhenIdle={Boolean(
              (footer !== false && footer?.items?.includes('desktopRelay')) ||
                workspace.capabilities?.features?.includes(
                  'client_mcp_over_ws',
                ),
            )}
          />
        ) : null}
        {!railLayout && collapseControl}
      </div>
    </div>
  );
  return (
    <>
      <aside
        ref={sidebarRef}
        className={cx(
          styles.sidebar,
          !railLayout &&
            (footerItems.has('version') || showUpdate) &&
            styles.withVersion,
          railLayout && styles.railLayout,
          (railLayout ? homeHidden : collapsed) && styles.collapsed,
          isResizing && styles.resizing,
          mobileOpen && styles.mobileOpen,
        )}
        aria-label={t('sidebar.label')}
        data-compact={
          containerWidth !== undefined && containerWidth <= 760 ? '' : undefined
        }
        style={sidebarStyle}
      >
        {groupMenu && (
          <div
            ref={groupMenuRef}
            className={styles.groupMenu}
            role="menu"
            aria-label={t('sidebar.sessionGroup')}
            style={{ top: groupMenu.top, left: groupMenu.left }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleGroupMenuKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className={cx(
                styles.groupMenuItem,
                groupMenuUngroupedSelected && styles.groupMenuItemActive,
              )}
              type="button"
              role="menuitemradio"
              aria-checked={groupMenuUngroupedSelected}
              onClick={() => assignSessionGroup(groupMenu.session, null)}
            >
              <span className={styles.groupMenuEmptyDot} />
              <span className={styles.groupMenuName}>
                {t('sidebar.groupUngrouped')}
              </span>
              {groupMenuUngroupedSelected && (
                <span className={styles.groupMenuCheck}>✓</span>
              )}
            </button>
            {menuColorOptions.map((color) => {
              const selected = groupMenuSelectedColor === color;
              return (
                <button
                  key={`color:${color}`}
                  className={cx(
                    styles.groupMenuItem,
                    selected && styles.groupMenuItemActive,
                  )}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => assignSessionColor(groupMenu.session, color)}
                >
                  <span
                    className={cx(
                      styles.groupMenuDot,
                      getGroupColorClass(color),
                    )}
                  />
                  <span className={styles.groupMenuName}>
                    {t(`sidebar.groupColor.${color}`)}
                  </span>
                  {selected && <span className={styles.groupMenuCheck}>✓</span>}
                </button>
              );
            })}
            {menuGroups.map((group) => {
              const selected = groupMenuSelectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  className={cx(
                    styles.groupMenuItem,
                    selected && styles.groupMenuItemActive,
                  )}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() =>
                    assignSessionGroup(groupMenu.session, group.id)
                  }
                >
                  <span
                    className={cx(
                      styles.groupMenuDot,
                      getGroupColorClass(group.color),
                    )}
                    style={getGroupColorStyle(group.color)}
                  />
                  <span className={styles.groupMenuName}>{group.name}</span>
                  {selected && <span className={styles.groupMenuCheck}>✓</span>}
                </button>
              );
            })}
            <div className={styles.groupMenuSeparator} />
            <button
              className={styles.groupMenuItem}
              type="button"
              role="menuitem"
              onClick={() => handleCreateGroupForSession(groupMenu.session)}
            >
              <span className={styles.groupMenuIcon}>
                <IconNewChat />
              </span>
              <span className={styles.groupMenuName}>
                {t('sidebar.groupCreate')}
              </span>
            </button>
          </div>
        )}
        {deleteCandidate && (
          <DialogShell
            title={t('delete.title')}
            size="sm"
            onClose={() => setDeleteCandidate(null)}
          >
            <div className={styles.confirmContent}>
              <p className={styles.confirmDescription}>
                {t('sidebar.deleteConfirmDescription', {
                  name: deleteCandidateLabel,
                })}
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className={styles.dangerButton}
                  type="button"
                  onClick={confirmDeleteSession}
                >
                  {t('sidebar.delete')}
                </button>
              </div>
            </div>
          </DialogShell>
        )}
        {workspaceRenameCandidate && (
          <WorkspaceRenameDialog
            key={workspaceRenameCandidate.id}
            workspace={workspaceRenameCandidate}
            busy={workspaceRenameSubmitting}
            onSubmit={(displayName) => void confirmWorkspaceRename(displayName)}
            onClose={() => {
              if (!workspaceRenameSubmitting) setWorkspaceRenameCandidate(null);
            }}
          />
        )}
        <WorkspaceRemovalDialog
          removal={workspaceRemoval}
          currentSessionInCandidate={
            Boolean(connection.sessionId) &&
            connection.workspaceCwd === workspaceRemoval.candidate?.cwd
          }
        />
        {groupEditor && (
          <DialogShell
            title={groupEditorTitle}
            size="sm"
            onClose={closeGroupEditor}
          >
            <form
              className="flex flex-col gap-6"
              onSubmit={(event) => {
                event.preventDefault();
                saveGroupEditor();
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="session-group-name">
                    {t('sidebar.groupNamePrompt')}
                  </FieldLabel>
                  <Input
                    id="session-group-name"
                    value={groupName}
                    autoFocus
                    maxLength={64}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="session-group-color">
                    {t('sidebar.groupColor')}
                  </FieldLabel>
                  <Select
                    value={
                      customGroupColor ? CUSTOM_GROUP_COLOR_OPTION : groupColor
                    }
                    onValueChange={(value) => {
                      setGroupColor(
                        value === CUSTOM_GROUP_COLOR_OPTION
                          ? lastValidCustomGroupColor
                          : (value as DaemonSessionGroupPresetColor),
                      );
                    }}
                  >
                    <SelectTrigger id="session-group-color" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {groupColorChoices.map((color) => (
                          <SelectItem key={color} value={color}>
                            {t(`sidebar.groupColor.${color}`)}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_GROUP_COLOR_OPTION}>
                          {t('sidebar.groupColor.custom')}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {customGroupColor && (
                  <Field>
                    <FieldLabel htmlFor="session-group-hex-color">
                      {t('sidebar.groupColor.hex')}
                    </FieldLabel>
                    <div className={styles.groupCustomColorRow}>
                      <Input
                        className={styles.groupColorPicker}
                        type="color"
                        value={lastValidCustomGroupColor}
                        aria-label={t('sidebar.groupColor.picker')}
                        onChange={(event) => {
                          const value =
                            event.target.value.toLowerCase() as DaemonSessionGroupHexColor;
                          setLastValidCustomGroupColor(value);
                          setGroupColor(value);
                        }}
                      />
                      <Input
                        id="session-group-hex-color"
                        value={groupColor}
                        maxLength={7}
                        spellCheck={false}
                        aria-invalid={normalizedGroupColor === undefined}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const trimmed = raw.trim();
                          const value = (
                            trimmed && !trimmed.startsWith('#')
                              ? `#${trimmed}`
                              : raw
                          ) as DaemonSessionGroupColor;
                          setGroupColor(value);
                          const normalized = normalizeHexColorInput(value);
                          if (normalized) {
                            setLastValidCustomGroupColor(normalized);
                          }
                        }}
                      />
                    </div>
                    {normalizedGroupColor === undefined && (
                      <span className={styles.groupColorError} role="alert">
                        {t('sidebar.groupColor.invalid')}
                      </span>
                    )}
                  </Field>
                )}
              </FieldGroup>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={groupBusy}
                  onClick={closeGroupEditor}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={!canSaveGroup}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogShell>
        )}
        {deleteGroupCandidate && (
          <DialogShell
            title={t('sidebar.groupDelete')}
            size="sm"
            onClose={() => {
              if (!groupBusy) setDeleteGroupCandidate(null);
            }}
          >
            <div className={styles.confirmContent}>
              <p className={styles.confirmDescription}>
                {t('sidebar.groupDeleteConfirm', {
                  name: deleteGroupCandidateLabel,
                })}
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={groupBusy}
                  onClick={() => setDeleteGroupCandidate(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className={styles.dangerButton}
                  type="button"
                  disabled={groupBusy}
                  onClick={confirmDeleteGroup}
                >
                  {t('sidebar.groupDelete')}
                </button>
              </div>
            </div>
          </DialogShell>
        )}
        {railLayout && (
          <Popover
            open={navigationHint !== null}
            onOpenChange={(open) => {
              if (!open) setNavigationHint(null);
            }}
          >
            {navigationHint && (
              <PopoverAnchor virtualRef={{ current: navigationHint }} />
            )}
            <nav
              onPointerOver={(event) => {
                if (event.pointerType !== 'mouse') return;
                const button = (event.target as Element).closest('button');
                setNavigationHint(
                  !moreOpen &&
                    !(
                      collapsed &&
                      button?.hasAttribute('data-web-shell-home-trigger')
                    ) &&
                    event.currentTarget.contains(button)
                    ? button
                    : null,
                );
              }}
              onPointerOut={(event) => {
                const button = (event.target as Element).closest('button');
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !button?.contains(event.relatedTarget)
                ) {
                  setNavigationHint(null);
                }
              }}
              onFocusCapture={(event) => {
                const button = event.target.closest('button');
                setNavigationHint(
                  !moreOpen &&
                    !(
                      collapsed &&
                      button?.hasAttribute('data-web-shell-home-trigger')
                    ) &&
                    event.currentTarget.contains(button)
                    ? button
                    : null,
                );
              }}
              onBlurCapture={() => setNavigationHint(null)}
              onClickCapture={() => setNavigationHint(null)}
              className={styles.rail}
              aria-label={t('sidebar.navigation')}
              data-web-shell-navigation-rail
            >
              <div className={styles.railPrimary}>
                {activityEnabled && (collapsed || homeHidden) && (
                  <button
                    type="button"
                    className={cx(styles.pluginButton, styles.activityToggle)}
                    aria-label={t(
                      activityOpen ? 'activity.close' : 'activity.open',
                    )}
                    aria-pressed={activityOpen}
                    onClick={toggleActivity}
                  >
                    <BellIcon size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.pluginButton}
                  aria-label={
                    collapsedSessionStatusLabel
                      ? `${t('sidebar.home')}: ${collapsedSessionStatusLabel}`
                      : t('sidebar.home')
                  }
                  aria-current={activePage === 'home' ? 'page' : undefined}
                  aria-expanded={!homeHidden || homePreviewOpen}
                  aria-haspopup={collapsed ? 'dialog' : undefined}
                  onClick={() => openNavigation(onOpenHome, true)}
                  data-web-shell-home-trigger
                  ref={homeTriggerRef}
                  onPointerEnter={(event) => {
                    if (
                      event.pointerType === 'mouse' &&
                      collapsed &&
                      !mobileOpen
                    ) {
                      setMoreOpen(false);
                      setHomePreviewOpen(true);
                    }
                  }}
                >
                  <span className={styles.navIcon}>
                    <HouseIcon size={16} strokeWidth={1.2} />
                    {collapsedSessionStatus && (
                      <span
                        className={cx(
                          styles.collapsedSessionStatusDot,
                          collapsedSessionStatus === 'approval' &&
                            styles.collapsedSessionStatusApproval,
                          collapsedSessionStatus === 'question' &&
                            styles.collapsedSessionStatusQuestion,
                        )}
                        data-web-shell-collapsed-session-status={
                          collapsedSessionStatus
                        }
                      />
                    )}
                  </span>
                </button>
                {primaryNavigation}
              </div>
              <div className={styles.footer} data-web-shell-rail-footer>
                {footer !== false &&
                  [...footerItems].some((item) => item !== 'collapse') && (
                    <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={styles.collapseButton}
                          aria-label={t('sidebar.more')}
                        >
                          <EllipsisIcon size={16} strokeWidth={1.2} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="end"
                        sideOffset={8}
                        className={styles.moreMenu}
                        aria-label={t('sidebar.more')}
                        data-web-shell-sidebar-more
                        onInteractOutside={(event) => {
                          const target =
                            event.detail.originalEvent.composedPath()[0] ??
                            event.target;
                          if (
                            target instanceof Element &&
                            target.closest(
                              '[data-web-shell-local-files-panel], [data-web-shell-desktop-relay-panel], [data-web-shell-update-manual]',
                            )
                          )
                            event.preventDefault();
                        }}
                      >
                        {footerContent}
                      </PopoverContent>
                      {showUpdate && (
                        <UpdateControl
                          client={workspace.client}
                          collapsed={false}
                          currentVersion={qwenCodeVersion}
                          onError={onError}
                          portalContainer={updateSlot}
                        />
                      )}
                      {footerItems.has('localFiles') &&
                        isPageOriginDaemon(workspace.baseUrl) && (
                          <LocalFilesControl
                            triggerClassName={styles.moreLocalFiles}
                            workspaces={workspaces}
                            portalContainer={localFilesSlot}
                          />
                        )}
                      {footerItems.has('desktopRelay') &&
                        isPageOriginDaemon(workspace.baseUrl) && (
                          <DesktopRelayControl
                            triggerClassName={styles.moreLocalFiles}
                            workspaces={workspaces}
                            portalContainer={desktopRelaySlot}
                            showWhenIdle={Boolean(
                              footer?.items?.includes('desktopRelay') ||
                                workspace.capabilities?.features?.includes(
                                  'client_mcp_over_ws',
                                ),
                            )}
                          />
                        )}
                    </Popover>
                  )}
                {collapseControl}
              </div>
            </nav>
            <PopoverContent
              role="tooltip"
              side="right"
              sideOffset={8}
              className="pointer-events-none w-auto bg-black px-3 py-1.5 text-xs text-white duration-0 data-open:animate-none data-closed:animate-none"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              {navigationHint?.getAttribute('aria-label')}
            </PopoverContent>
          </Popover>
        )}
        <SidebarSessionSurface
          collapsed={railLayout && collapsed && !mobileOpen}
          label={t('sidebar.home')}
          width={sidebarWidth - SIDEBAR_RAIL_WIDTH}
          open={homePreviewOpen}
          onOpenChange={setHomePreviewOpen}
          isCloseBlocked={isCollapsedCloseBlocked}
          home={{
            anchor: homeTriggerRef,
            hidden: homeHidden,
            section: liveView ? 'live' : channelView ? 'channels' : 'home',
          }}
        >
          {sectionView && (
            <div className={styles.sectionHeader}>
              {t(liveView ? 'sidebar.live' : 'sidebar.channels')}
            </div>
          )}
          {liveView &&
            !homeHidden &&
            (mobileOpen || (containerWidth ?? window.innerWidth) > 760) && (
              <div
                ref={onLiveVoiceSlotChange}
                className="mb-2"
                data-live-voice-slot
              />
            )}
          {!sectionView && shouldRenderBrand && (
            <div className={styles.topRow}>
              {branding?.render ? (
                branding.render()
              ) : (
                <>
                  <span className={styles.brandLogo} aria-hidden="true">
                    {brand.logo ||
                      (brand.logoDataUri ? (
                        // `key` remounts on a new URI: after one decode failure,
                        // the failed state must not stick to the next logo.
                        <BrandLogoImage
                          key={brand.logoDataUri}
                          dataUri={brand.logoDataUri}
                        />
                      ) : (
                        <IconQwenLogo />
                      ))}
                  </span>
                  {(!collapsed || mobileOpen || homePreviewOpen) && (
                    <span className={styles.brandName}>{brandName}</span>
                  )}
                </>
              )}
              {activityEnabled && (!railLayout || !collapsed || mobileOpen) && (
                <button
                  type="button"
                  className={cx(
                    'ml-auto relative rounded-lg p-2 hover:bg-accent',
                    styles.activityToggle,
                  )}
                  aria-label={t(
                    activityOpen ? 'activity.close' : 'activity.open',
                  )}
                  title={`${t(activityOpen ? 'activity.close' : 'activity.open')} (⌥⌘U / Ctrl+Alt+U)`}
                  aria-pressed={activityOpen}
                  onClick={toggleActivity}
                >
                  <BellIcon size={18} strokeWidth={1.5} />
                  {activityEntries.some(
                    (entry) =>
                      isActivityEligible(entry, activityPreferences) &&
                      activityNeedsAttention(entry),
                  ) && (
                    <span
                      className="absolute right-1 top-1 size-1.5 rounded-full bg-primary"
                      data-activity-attention
                    />
                  )}
                </button>
              )}
            </div>
          )}
          {!sectionView && primaryNavItems.has('newTask') && (
            <div
              className={cx(
                styles.newTaskNav,
                bodyScrolled && styles.newTaskNavScrolled,
              )}
            >
              <button
                className={styles.newChatButton}
                type="button"
                title={t('sidebar.newTask')}
                aria-label={t('sidebar.newTask')}
                disabled={newSessionDisabled}
                onClick={() => handleNewSession()}
              >
                <span className={styles.navIcon}>
                  <SquarePenIcon size={16} strokeWidth={1.2} />
                </span>
                {(!collapsed || homePreviewOpen) && (
                  <span>{t('sidebar.newTask')}</span>
                )}
              </button>
            </div>
          )}
          <div
            className={styles.body}
            onScroll={(event) =>
              setBodyScrolled(event.currentTarget.scrollTop > 0)
            }
          >
            {!railLayout && primaryNavigation}
            {railLayout && !sectionView && primaryNavOptions?.render?.()}
            {/* Workspace navigation is daemon-scoped rather than a control on
              the active session, so it stays available in a projectless chat
              instead of stranding the user with no way back to a workspace.
              The affordances inside it that open a project panel or dialog
              stay gated on projectFeaturesEnabled below. */}
            <SidebarSessionSurface
              collapsed={!railLayout && collapsed}
              label={t(
                sessionContent === undefined
                  ? 'sidebar.project'
                  : 'managed.sessions',
              )}
              status={
                sessionContent === undefined
                  ? collapsedSessionStatus
                  : undefined
              }
              statusLabel={
                sessionContent === undefined
                  ? collapsedSessionStatusLabel
                  : undefined
              }
              width={sidebarWidth}
              open={collapsedSessionsOpen}
              onOpenChange={setCollapsedSessionsOpen}
              content={
                activityOpen && activityEnabled ? (
                  <ActivityView
                    key={activityScope}
                    operations={activityOperations}
                    entries={activityEntries}
                    loading={activity.loading}
                    unavailable={activity.unavailable || !daemonAvailable}
                    hasMore={activity.hasMore}
                    onLoadMore={() => undefined}
                    onRetry={activity.retry}
                    renderSession={(entry, preview) =>
                      renderSessionRow(entry.session, {
                        searchSnippet: preview ?? '',
                      })
                    }
                    onMarkRead={markActivityRead}
                    onArchive={activity.archive}
                    onUndo={activity.undo}
                    loadPreview={activity.loadPreview}
                    pinnedExpanded={pinnedExpanded}
                    onPinnedExpandedChange={setPinnedExpanded}
                    canArchive={
                      sessionArchiveEnabled && sessionActionItems.has('archive')
                    }
                  />
                ) : (
                  sessionContent
                )
              }
              header={sessionHeader}
              isCloseBlocked={isCollapsedCloseBlocked}
            >
              {!channelNavigationEnabled &&
                !liveView &&
                showSessionSourceSwitch &&
                sourceMetadataEnabled && (
                  <Tabs
                    className="px-2 pb-2"
                    value={sessionSource}
                    onValueChange={(value) =>
                      setSessionSource(value as SidebarSessionSource)
                    }
                  >
                    <TabsList
                      className="w-full"
                      aria-label={t('sidebar.sessionSource')}
                    >
                      <TabsTrigger value="default" className="min-w-0">
                        <ListTodoIcon />
                        <span className="min-w-0 truncate">
                          {t('sidebar.sessionSource.tasks')}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="channel" className="min-w-0">
                        <MessageCircleIcon />
                        <span className="min-w-0 truncate">
                          {t('sidebar.sessionSource.channels')}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              {liveView &&
                connection.capabilities &&
                !livePresence &&
                liveWorkspaces.length === 0 && (
                  <Empty className="gap-2 py-8">
                    <EmptyMedia className="mb-0 text-muted-foreground/40">
                      <InboxIcon size={40} strokeWidth={1} aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyDescription className="text-xs">
                      {t('sidebar.noSessions')}
                    </EmptyDescription>
                  </Empty>
                )}
              {!channelView &&
                (!liveNavigationEnabled || liveView) &&
                showLive &&
                livePresence &&
                liveWorkspaces.length === 0 && (
                  <div
                    className={styles.livePendingWorkspace}
                    data-live-pending-workspace
                  >
                    {!liveView && (
                      <div className={styles.livePendingHeader}>
                        <AudioLinesIcon
                          size={16}
                          strokeWidth={1.2}
                          aria-hidden="true"
                        />
                        <span>{t('sidebar.live')}</span>
                      </div>
                    )}
                    {livePendingRow}
                  </div>
                )}
              {!channelView &&
                (!liveNavigationEnabled || liveView) &&
                liveWorkspaces.map((ws) => (
                  <WorkspaceSection
                    key={ws.id}
                    workspace={ws}
                    hideHeader={liveView}
                    expanded={liveView ? true : undefined}
                    renderHeader={(expanded) => (
                      <span className={styles.liveWorkspaceHeader}>
                        <AudioLinesIcon
                          size={16}
                          strokeWidth={1.2}
                          aria-hidden="true"
                        />
                        <span>{t('sidebar.live')}</span>
                        <IconChevron expanded={expanded} />
                      </span>
                    )}
                    client={workspace.client}
                    editingSessionId={editingSessionIdForSections}
                    pendingSession={
                      livePresence &&
                      (!livePresence.coordinator ||
                        livePresence.coordinator.workspaceCwd === ws.cwd)
                        ? {
                            key: livePresence.callId ?? 'connecting',
                            sessionId: livePresence.coordinator?.sessionId,
                            sourceId: livePresence.callId
                              ? `realtime_voice:${livePresence.callId}`
                              : undefined,
                            node: livePendingRow,
                          }
                        : undefined
                    }
                    reloadToken={workspaceSessionsReloadToken}
                    untrustedLabel={t('sidebar.workspaceUntrusted')}
                    readOnlyLabel={t('sidebar.workspaceReadOnly')}
                    trustToOpenLabel={t('sidebar.workspaceTrustToOpen')}
                    noSessionsLabel={t('sidebar.noSessions')}
                    loadErrorLabel={t('sidebar.loadFailed')}
                    organizationEnabled={false}
                    sessionCatalogRequestsEnabled={
                      sessionCatalogRequestsEnabled
                    }
                    sessionLiveStateEnabled={
                      workspaceSessionLiveStateEnabled &&
                      liveStateWorkspaceCwdSet.has(ws.cwd)
                    }
                    sourceType={sourceMetadataEnabled ? 'default' : undefined}
                    channelGroupingEnabled={false}
                    ungroupedLabel={t('sidebar.groupUngrouped')}
                    excludePinned={
                      !liveView && selectedSessionSource !== 'channel'
                    }
                    mapSession={applyOptimisticPin}
                    isPinnedSectionMember={isPinnedSectionMember}
                    autoExpandKey={
                      livePresence &&
                      (!livePresence.coordinator ||
                        livePresence.coordinator.workspaceCwd === ws.cwd)
                        ? `live:${livePresence.callId ?? 'connecting'}`
                        : autoExpandWorkspace?.id === ws.id
                          ? autoExpandWorkspace.key
                          : undefined
                    }
                    forceAutoExpand={Boolean(livePresence)}
                    renderSession={(session, options) =>
                      renderSessionRow(
                        { ...session, workspaceCwd: ws.cwd },
                        options,
                      )
                    }
                    showSessionDetails={sessionActionItems.has('details')}
                  />
                ))}
              {pinnedSectionVisible && (
                <>
                  <SidebarSectionHeader
                    label={t('sidebar.pinnedSessions')}
                    expanded={pinnedExpanded}
                    onToggle={() => setPinnedExpanded((expanded) => !expanded)}
                  />
                  {pinnedExpanded && (
                    <div className={styles.pinnedSessionList}>
                      {pinnedSessions.map((session) =>
                        renderSessionRow(session),
                      )}
                    </div>
                  )}
                </>
              )}
              {!liveView && !hideProjectHeader && (
                <div className={styles.projectsHeader}>
                  <button
                    className={styles.projectsHeaderToggle}
                    type="button"
                    aria-expanded={projectsExpanded}
                    onClick={() => {
                      const nextExpanded = !projectsExpanded;
                      writeWorkspaceExpanded('projects', nextExpanded);
                      setProjectsExpanded(nextExpanded);
                    }}
                  >
                    <span>{t('sidebar.project')}</span>
                    {workspaceOverviewEnabled &&
                      managedWorkspaces === undefined &&
                      projectWorkspaces.length > 1 && (
                        <span
                          className={styles.projectsHeaderCount}
                          aria-label={t('sidebar.workspaceCount', {
                            count: projectWorkspaces.length,
                          })}
                          title={t('sidebar.workspaceCount', {
                            count: projectWorkspaces.length,
                          })}
                        >
                          {projectWorkspaces.length}
                        </span>
                      )}
                    <IconChevron expanded={projectsExpanded} />
                  </button>
                  <div className={styles.projectsHeaderActions}>
                    {!channelView &&
                      !lockedWorkspaceCwd &&
                      onOpenWorkspacesOverview && (
                        <button
                          className={styles.projectsHeaderAction}
                          type="button"
                          data-testid="manage-workspaces"
                          title={t('sidebar.manageWorkspaces')}
                          aria-label={t('sidebar.manageWorkspaces')}
                          onClick={onOpenWorkspacesOverview}
                        >
                          <FolderKanbanIcon />
                        </button>
                      )}
                    <button
                      className={styles.projectsHeaderAction}
                      type="button"
                      title={t('sidebar.search')}
                      aria-label={t('sidebar.search')}
                      onClick={() => {
                        setSearchOpen((open) => {
                          if (open) setSearchQuery('');
                          return !open;
                        });
                        setProjectsExpanded(true);
                      }}
                    >
                      <SearchIcon />
                    </button>
                    {!channelView &&
                      !lockedWorkspaceCwd &&
                      onOpenAddWorkspace && (
                        <button
                          className={styles.projectsHeaderAction}
                          type="button"
                          title={t('sidebar.addWorkspace')}
                          aria-label={t('sidebar.addWorkspace')}
                          onClick={onOpenAddWorkspace}
                        >
                          <PlusIcon />
                        </button>
                      )}
                  </div>
                </div>
              )}
              {!liveView && searchOpen && !hideProjectHeader && (
                <div className={styles.projectSearch}>
                  <SearchIcon aria-hidden="true" />
                  <Input
                    value={searchQuery}
                    placeholder={t('sidebar.searchPlaceholder')}
                    aria-label={t('sidebar.search')}
                    autoFocus
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setSearchQuery('');
                        setSearchOpen(false);
                      }
                    }}
                  />
                </div>
              )}
              {/* Managed 历史由外部 App Host 注入，不受本地 Workspaces
                  折叠状态控制；否则折叠分组会把仍有效的 Managed 会话一起隐藏。 */}
              {!channelView && !liveView && managedWorkspaces}
              <div
                className="flex flex-col"
                hidden={liveView || !projectsExpanded}
              >
                {/* Multi-daemon (#13727): the connected host occupies its
                    fixed origin rank instead of floating to the top, so a
                    focused switch keeps every host in place. The wrapper
                    carries its order; the group entities below come from
                    OtherHostProjects' own per-origin ranks — still reading
                    in DOM order for a11y, the flex order governs paint. */}
                <div
                  className="flex flex-col"
                  style={
                    rankedHostOrigins.length > 1
                      ? { order: rankOfHost(focusedHostOrigin) }
                      : undefined
                  }
                >
                  {!hideProjectHeader && <WorkspaceHostHeading />}
                  <div className={styles.workspacePicker}>
                    <div className={styles.workspaceList}>
                      {orderedProjectWorkspaces.map((ws) => (
                        <Fragment key={ws.id}>
                          <WorkspaceSection
                            workspace={ws}
                            executionLabel={
                              managedWorkspaces !== undefined
                                ? t('managed.localMode')
                                : undefined
                            }
                            remote={!isPageOriginDaemon(workspace.baseUrl)}
                            renderHeader={
                              lockedWorkspaceCwd &&
                              lockedWorkspaceOptions?.render
                                ? (expanded) =>
                                    lockedWorkspaceOptions.render?.(ws, {
                                      expanded,
                                    })
                                : undefined
                            }
                            client={workspace.client}
                            editingSessionId={editingSessionIdForSections}
                            reloadToken={workspaceSessionsReloadToken}
                            untrustedLabel={t('sidebar.workspaceUntrusted')}
                            readOnlyLabel={t('sidebar.workspaceReadOnly')}
                            trustToOpenLabel={t('sidebar.workspaceTrustToOpen')}
                            noSessionsLabel={t('sidebar.noSessions')}
                            loadErrorLabel={t('sidebar.loadFailed')}
                            organizationEnabled={organizationEnabled}
                            sessionCatalogRequestsEnabled={
                              sessionCatalogRequestsEnabled
                            }
                            sessionGroupCatalog={
                              workspaceSessionLiveStateEnabled &&
                              liveStateWorkspaceCwdSet.has(ws.cwd)
                                ? liveStateGroupCatalogs.get(ws.cwd)
                                : undefined
                            }
                            sessionLiveStateEnabled={
                              workspaceSessionLiveStateEnabled &&
                              liveStateWorkspaceCwdSet.has(ws.cwd)
                            }
                            sourceType={selectedSessionSource}
                            channelGroupingEnabled={channelGroupingEnabled}
                            ungroupedLabel={t('sidebar.groupUngrouped')}
                            onRenameGroup={
                              canOrganizeWorkspace(ws.cwd)
                                ? handleRenameGroup
                                : undefined
                            }
                            onDeleteGroup={
                              canOrganizeWorkspace(ws.cwd)
                                ? handleDeleteGroup
                                : undefined
                            }
                            renameGroupLabel={t('sidebar.groupRename')}
                            deleteGroupLabel={t('sidebar.groupDelete')}
                            groupActionsDisabled={groupBusy}
                            excludePinned={selectedSessionSource !== 'channel'}
                            mapSession={applyOptimisticPin}
                            isPinnedSectionMember={isPinnedSectionMember}
                            onOpenGitDiff={
                              projectFeaturesEnabled ? onOpenGitDiff : undefined
                            }
                            onOpenCommit={
                              projectFeaturesEnabled ? onOpenCommit : undefined
                            }
                            searchQuery={searchQuery}
                            expanded={ws.primary ? projectExpanded : undefined}
                            autoExpandKey={
                              autoExpandWorkspace?.id === ws.id
                                ? autoExpandWorkspace?.key
                                : undefined
                            }
                            onExpandedChange={
                              ws.primary
                                ? (expanded) => {
                                    writeWorkspaceExpanded(
                                      primaryWorkspaceExpansionId,
                                      expanded,
                                    );
                                    setProjectExpanded(expanded);
                                  }
                                : undefined
                            }
                            renderSessions={!ws.primary}
                            renderSession={(session, renderOptions) =>
                              renderSessionRow(
                                {
                                  ...session,
                                  workspaceCwd: ws.cwd,
                                },
                                {
                                  ...renderOptions,
                                  // Pinned members also render in the
                                  // sidebar-level Pinned section; while that
                                  // section is expanded its row hosts the
                                  // rename form, so this duplicate row must
                                  // not mount a second autofocused input.
                                  // Channel mode has no Pinned section, so
                                  // the workspace row is the only copy and
                                  // must stay editable. The suppression also
                                  // requires the Pinned section to actually
                                  // carry the member: `pinnedSessions` merges
                                  // only the pinned catalog pages and the
                                  // primary sessions page, never this
                                  // workspace's own page, so before the
                                  // pinned page settles (or while it errors)
                                  // this row is the only copy and must host
                                  // the form itself.
                                  renameFormDisabled:
                                    selectedSessionSource !== 'channel' &&
                                    Boolean(session.isPinned) &&
                                    pinnedExpanded &&
                                    pinnedSessions.some(
                                      (candidate) =>
                                        getIdentityForSession(candidate) ===
                                        getIdentityForSession(session),
                                    ),
                                },
                              )
                            }
                            showSessionDetails={sessionActionItems.has(
                              'details',
                            )}
                            overviewEnabled={
                              !channelView && workspaceOverviewEnabled
                            }
                            overviewMenuOpen={openWorkspaceMenuId === ws.id}
                            overviewItems={workspaceOverviewItems}
                            onOpenPathLocally={
                              localOpenEnabled
                                ? openWorkspaceFolderLocally
                                : undefined
                            }
                            onOpenTerminalLocally={
                              localTerminalEnabled
                                ? openWorkspaceTerminalLocally
                                : undefined
                            }
                            gitBranchWanted={
                              !sectionView &&
                              Boolean(onNewWorktreeSession) &&
                              !lockedWorkspaceCwd
                            }
                            sessionStats={
                              ws.primary
                                ? (primarySessionStats ?? null)
                                : undefined
                            }
                            // A locked sidebar with a custom header renders no
                            // action area, so wire nothing: the section then
                            // skips the git poll that only feeds these actions.
                            headerActions={
                              channelView ||
                              (lockedWorkspaceCwd &&
                                lockedWorkspaceOptions?.render)
                                ? undefined
                                : (visible, { overview, gitBranch }) => {
                                    const canRemove =
                                      !lockedWorkspaceCwd &&
                                      workspaceRemovalEnabled &&
                                      !ws.primary &&
                                      ws.removable === true;
                                    if (!ws.trusted && !canRemove) return null;
                                    const wsCwd = ws.cwd;
                                    const realPath = isAbsolutePath(ws.cwd);
                                    // A display name persists only for registration-backed
                                    // rows; the daemon's bound (primary) workspace has no
                                    // registration id, so a rename there would live in
                                    // memory until the next restart. Trust is not required:
                                    // the name is registry metadata, not runtime access.
                                    const canRename =
                                      !lockedWorkspaceCwd &&
                                      workspaceRenameEnabled &&
                                      realPath &&
                                      !ws.primary;
                                    // Management pages read the connection's bound
                                    // workspace, so only the primary row can open
                                    // its own view today (#10399, layer B1).
                                    const canManage =
                                      projectFeaturesEnabled &&
                                      ws.primary &&
                                      ws.trusted &&
                                      Boolean(onOpenWorkspaceManagement);
                                    const workspaceIndex =
                                      orderedProjectWorkspaces.findIndex(
                                        (entry) => entry.cwd === ws.cwd,
                                      );
                                    const canMoveWorkspace =
                                      !lockedWorkspaceCwd &&
                                      ws.trusted &&
                                      workspaceIndex >= 0 &&
                                      orderedProjectWorkspaces.length > 1;
                                    const menuActions: WorkspaceMenuActions = {
                                      ...(canRename
                                        ? {
                                            rename: () =>
                                              requestWorkspaceRename(ws),
                                          }
                                        : {}),
                                      ...(realPath
                                        ? {
                                            copyPath: () =>
                                              copyWorkspacePath(ws),
                                          }
                                        : {}),
                                      ...(localOpenEnabled &&
                                      ws.trusted &&
                                      realPath &&
                                      !ws.ssh
                                        ? {
                                            openFolder: () => {
                                              void openWorkspaceFolderLocally(
                                                ws.cwd,
                                              ).catch(() => undefined);
                                            },
                                          }
                                        : {}),
                                      ...(localTerminalEnabled &&
                                      ws.trusted &&
                                      realPath &&
                                      !ws.ssh
                                        ? {
                                            openTerminal: () => {
                                              void openWorkspaceTerminalLocally(
                                                ws.cwd,
                                              ).catch(() => undefined);
                                            },
                                          }
                                        : {}),
                                      ...(ws.trusted
                                        ? {
                                            newSession: () =>
                                              handleNewSession(wsCwd),
                                          }
                                        : {}),
                                      // A worktree needs a git repository; without a
                                      // branch the composer never shows the armed
                                      // intent and the daemon rejects the session.
                                      ...(ws.trusted &&
                                      !ws.ssh &&
                                      onNewWorktreeSession &&
                                      gitBranch
                                        ? {
                                            newWorktreeSession: () =>
                                              handleNewWorktreeSession(wsCwd),
                                          }
                                        : {}),
                                      ...(ws.trusted &&
                                      canOrganizeWorkspace(ws.cwd)
                                        ? {
                                            createGroup: () => {
                                              if (ws.primary) {
                                                handleCreateGroup();
                                              } else {
                                                handleCreateWorkspaceGroup(
                                                  ws.cwd,
                                                );
                                              }
                                            },
                                          }
                                        : {}),
                                      ...(canMoveWorkspace && workspaceIndex > 0
                                        ? {
                                            moveUp: () =>
                                              moveWorkspaceInList(ws.cwd, -1),
                                          }
                                        : {}),
                                      ...(canMoveWorkspace &&
                                      workspaceIndex <
                                        orderedProjectWorkspaces.length - 1
                                        ? {
                                            moveDown: () =>
                                              moveWorkspaceInList(ws.cwd, 1),
                                          }
                                        : {}),
                                      ...(canManage
                                        ? {
                                            openManagement: (
                                              target: WorkspaceManagementTarget,
                                            ) =>
                                              onOpenWorkspaceManagement?.(
                                                target,
                                                ws.cwd,
                                              ),
                                          }
                                        : {}),
                                      ...(ws.trusted && realPath
                                        ? {
                                            reload: () =>
                                              reloadWorkspaceRuntime(ws),
                                          }
                                        : {}),
                                      ...(canRemove
                                        ? {
                                            remove: () =>
                                              workspaceRemoval.request(ws),
                                          }
                                        : {}),
                                    };
                                    return (
                                      <div
                                        className={
                                          styles.workspaceHeaderActions
                                        }
                                        style={{
                                          visibility:
                                            visible ||
                                            openWorkspaceMenuId === ws.id
                                              ? 'visible'
                                              : 'hidden',
                                        }}
                                      >
                                        {ws.trusted && (
                                          <button
                                            className={
                                              styles.workspaceHeaderAction
                                            }
                                            type="button"
                                            title={t('sidebar.newTask')}
                                            aria-label={t('sidebar.newTask')}
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              handleNewSession(wsCwd);
                                            }}
                                          >
                                            <SquarePenIcon
                                              size={16}
                                              strokeWidth={1.2}
                                            />
                                          </button>
                                        )}
                                        {(!lockedWorkspaceCwd ||
                                          menuActions.createGroup) && (
                                          <WorkspaceMenu
                                            workspace={ws}
                                            actions={
                                              lockedWorkspaceCwd
                                                ? {
                                                    createGroup:
                                                      menuActions.createGroup,
                                                  }
                                                : menuActions
                                            }
                                            overview={overview}
                                            disabled={
                                              (workspaceRemoval.submitting &&
                                                workspaceRemoval.candidate
                                                  ?.id === ws.id) ||
                                              (workspaceRenameSubmitting &&
                                                workspaceRenameCandidate?.id ===
                                                  ws.id)
                                            }
                                            triggerClassName={
                                              styles.workspaceHeaderAction
                                            }
                                            contentStyle={
                                              SESSION_MENU_PORTAL_STYLE
                                            }
                                            onOpenChange={(open) => {
                                              handleSessionMenuOpenChange(open);
                                              setOpenWorkspaceMenuId(
                                                (current) =>
                                                  open
                                                    ? ws.id
                                                    : current === ws.id
                                                      ? null
                                                      : current,
                                              );
                                            }}
                                            onPointerDownOutside={
                                              handleSessionMenuPointerDownOutside
                                            }
                                            onCloseAutoFocus={(event) => {
                                              // Radix restores focus to the
                                              // trigger, which lives inside the
                                              // details popover's focus-open
                                              // anchor — without suppression the
                                              // popover reopens 300 ms after
                                              // every menu close and never
                                              // closes.
                                              event.preventDefault();
                                            }}
                                          />
                                        )}
                                      </div>
                                    );
                                  }
                            }
                          />
                          {ws.primary &&
                          (projectExpanded || searchQuery.trim()) ? (
                            <div className={styles.workspaceSessionBody}>
                              {body}
                            </div>
                          ) : null}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                {!hideProjectHeader && (
                  <OtherHostProjects
                    onOpenHostSession={onOpenHostSession}
                    rankOf={rankOfHost}
                  />
                )}
              </div>
              {!liveView &&
                standaloneSessionsVisible &&
                onLoadStandaloneSession &&
                onStandaloneNotice && (
                  <StandaloneRecents
                    archiveState="active"
                    currentSessionId={connection.sessionId}
                    currentSessionReady={
                      connection.status === 'connected' &&
                      !connection.error &&
                      !connection.loadingTranscript &&
                      !connection.catchingUp
                    }
                    refreshKey={standaloneRefreshKey}
                    searchQuery={searchQuery}
                    renderSession={(session, standalone) =>
                      renderSessionRow(session, {
                        isArchived: standalone.isArchived,
                        standalone,
                      })
                    }
                    onNewSession={
                      onNewStandaloneSession
                        ? () => {
                            void Promise.resolve(onNewStandaloneSession()).then(
                              (created) => {
                                if (created) handleStandaloneMutation();
                              },
                            );
                          }
                        : undefined
                    }
                    onLoadSession={onLoadStandaloneSession}
                    onRenameSession={(sessionId, displayName) =>
                      onSessionRenameConfirmed?.(
                        undefined,
                        sessionId,
                        displayName,
                      )
                    }
                    onMutated={handleStandaloneMutation}
                    onError={onError}
                    onNotice={onStandaloneNotice}
                  />
                )}
              {!sectionView &&
                !hideProjectHeader &&
                workspaceQualifiedRestCoreEnabled && (
                  <RecentSessions
                    client={workspace.client}
                    onVisibleRowsChange={setVisibleRecentRows}
                    onNewSession={() => handleNewSession(undefined, true)}
                    newSessionDisabled={newSessionDisabled}
                    refreshPaused={sessionTransitioning}
                    workspaces={projectWorkspaces}
                    includeStandalone={standaloneSessionsVisible}
                    sourceMetadataEnabled={sourceMetadataEnabled}
                    organizationEnabled={organizationEnabled}
                    currentSessionId={connection.sessionId}
                    refreshKey={
                      standaloneRefreshKey + workspaceSessionsReloadToken
                    }
                    renderSession={(entry) => {
                      const isStandalone = entry.workspaceCwd === undefined;
                      const session = isStandalone
                        ? entry.session
                        : applyOptimisticPin({
                            ...entry.session,
                            workspaceCwd: entry.workspaceCwd!,
                          });
                      if (
                        session.isPinned ||
                        (!isStandalone &&
                          pinnedSectionIdentities.has(
                            getIdentityForSession(session),
                          ))
                      )
                        return null;
                      const isCurrent = isStandalone
                        ? connection.sessionContext?.kind === 'standalone' &&
                          connection.sessionId === session.sessionId
                        : isCurrentSession(session);
                      const busy = busySessionIds.has(
                        getIdentityForSession(session),
                      );
                      const running = Boolean(
                        session.hasActivePrompt ||
                          session.activeWorkState === 'active',
                      );
                      const pinLabel = session.isPinned
                        ? t('sidebar.unpin')
                        : t('sidebar.pin');
                      const archiveDisabled =
                        busy ||
                        isCurrent ||
                        running ||
                        !sessionActionItems.has('archive') ||
                        (!isStandalone && !canArchiveSession(session));
                      return renderSessionRow(session, {
                        searchSnippet: '',
                        recent: {
                          isCurrent,
                          isStandalone,
                          onOpen: () => {
                            if (entry.workspaceCwd)
                              handleLoadSession(
                                session.sessionId,
                                entry.workspaceCwd,
                              );
                            else
                              void Promise.resolve(
                                onLoadStandaloneSession?.(
                                  session.sessionId,
                                  session.displayName,
                                ),
                              ).catch((error) =>
                                onError(error, t('sidebar.switchFailed')),
                              );
                          },
                          actions: (
                            <>
                              <button
                                type="button"
                                className={cx(
                                  styles.sessionActionButton,
                                  session.isPinned &&
                                    styles.activeSessionActionButton,
                                )}
                                aria-label={pinLabel}
                                title={
                                  isStandalone
                                    ? t('sidebar.standalonePinUnavailable')
                                    : pinLabel
                                }
                                disabled={
                                  busy ||
                                  isStandalone ||
                                  !canOrganizeSession(session, 'pin')
                                }
                                onClick={() => handleTogglePin(session)}
                              >
                                <PinIcon size={16} strokeWidth={1.2} />
                              </button>
                              <button
                                type="button"
                                className={styles.sessionActionButton}
                                aria-label={t('sidebar.archive')}
                                title={
                                  isCurrent
                                    ? t('sidebar.archiveCurrentDisabled')
                                    : running
                                      ? t('sidebar.archiveRunningDisabled')
                                      : t('sidebar.archive')
                                }
                                disabled={archiveDisabled}
                                onClick={() =>
                                  isStandalone
                                    ? handleArchiveRecentStandalone(session)
                                    : handleArchive(session)
                                }
                              >
                                <ArchiveIcon size={16} strokeWidth={1.2} />
                              </button>
                            </>
                          ),
                        },
                      });
                    }}
                  />
                )}
            </SidebarSessionSurface>
          </div>

          {railLayout &&
            footer &&
            typeof footer === 'object' &&
            footer.render && (
              <div className={styles.homeFooter}>{footer.render()}</div>
            )}
        </SidebarSessionSurface>
        {!railLayout && footerContent}
        <div
          className={styles.resizeHandle}
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handleResizePointerDown}
        />
      </aside>
      {archivedSection}
    </>
  );
}
