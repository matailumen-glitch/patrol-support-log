const STORAGE_KEY="patrol-support-log-v11b";
function saveAppState(){localStorage.setItem(STORAGE_KEY,JSON.stringify({selectedCourseKey,currentSessionNo,currentSession,sessions,targets,currentTargetIndex,histories,lastMoveBaseTime}))}
function loadAppState(){const t=localStorage.getItem(STORAGE_KEY);return t?JSON.parse(t):null}
function clearAppState(){localStorage.removeItem(STORAGE_KEY)}
