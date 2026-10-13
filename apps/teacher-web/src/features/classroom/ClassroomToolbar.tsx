import type { ReactNode } from 'react';
import { Keyboard, Sparkles, UsersRound, Volume2 } from 'lucide-react';
import { FullscreenButtons } from './FullscreenButtons';
import type { FullscreenControls } from './usePresentationFullscreen';
import { useNarrationVolume } from '../economic-mathematics/narration-settings';
import { PresentationToolbar, usePageTools, usePageToolsScope } from './PageTools';
import './page-tools.css';

interface ClassroomToolbarProps {
  navigation: ReactNode;
  more: ReactNode;
  fullscreen: FullscreenControls;
  avatarCollapsed: boolean;
  locale?: 'zh-CN' | 'en';
  onTeacherSpeech: () => void;
  onToggleAvatar: () => void;
  onParticipation: () => void;
}
export function ClassroomToolbar(props: ClassroomToolbarProps) {
  const scope = usePageToolsScope(), [volume, setVolume] = useNarrationVolume();
  const t = (zh: string, en: string) => props.locale === 'en' ? en : zh;
  usePageTools(scope ? { pageKey: scope.pageKey, actions: [
    { id: 'teacher-speech', label: t('教师发言', 'Teacher message'), icon: <Keyboard size={18}/>, area: 'utility', onInvoke: props.onTeacherSpeech },
    { id: 'volume', label: t('声音设置', 'Sound settings'), title: t(`声音设置 · 音量${volume}%`, `Sound settings · ${volume}%`), icon: <Volume2 size={18}/>, area: 'utility', priority: 'secondary', panelId: 'volume' }
  ], panels: [{ id: 'volume', title: t('声音设置', 'Sound settings'), content: <>
    <label>{t('讲解与发言音量', 'Narration and message volume')}<input type="range" aria-label={t('课堂语音音量', 'Classroom speech volume')}
      min="0" max="500" step="10" value={volume} onChange={event => setVolume(Number(event.target.value))}/><output>{volume}%</output></label>
    <small>{t('同一设置用于本页讲解和教师发言。短片及港口旁白保留各自的音轨音量。', 'Shared by page narration and teacher messages. Films and port narration retain their track controls.')}</small>
  </> }] } : null);
  return <PresentationToolbar label={t('课堂工具栏', 'Classroom toolbar')} moreLabel={t('更多工具', 'More tools')}
    navigation={props.navigation} more={props.more} utilities={<>
      <button type="button" className="presentation-common-tool" aria-label={props.avatarCollapsed ? t('展开数字人浮窗', 'Show avatar') : t('收起数字人浮窗', 'Hide avatar')}
        title={t('数字人', 'Avatar')} aria-pressed={!props.avatarCollapsed} onClick={props.onToggleAvatar}><Sparkles size={18}/><span>{t('数字人', 'Avatar')}</span></button>
      <button type="button" className="presentation-common-tool" aria-label={t('打开课堂活动', 'Open class activities')} title={t('课堂活动', 'Class activities')}
        onClick={props.onParticipation}><UsersRound size={18}/><span>{t('课堂活动', 'Activities')}</span></button>
    </>} end={<FullscreenButtons controls={props.fullscreen} locale={props.locale}/>}/>;
}
