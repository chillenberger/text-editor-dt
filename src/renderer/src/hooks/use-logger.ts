
import { useContext } from "react";
import { ChatSessionContext } from '@renderer/components/session';

export default function useLogger() {
  const {sessionValue: session, updateSession} = useContext(ChatSessionContext);

  function newSession() {
    updateSession();
  }

  async function log(action: string, detail: string) {
    await window.electron.ipcRenderer.invoke('log-action', action, detail, session ? session : 'no_session');
  }

  async function removedDirLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Removed Directory', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function addedDirLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Added Directory', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function editedFileLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Edited File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function createdFileLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Created File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function deletedFileLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Deleted File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function switchedActiveFileLog(path: string) {
    await window.electron.ipcRenderer.invoke('log-action', 'Switched Active File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  return {
    log,
    removedDirLog,
    addedDirLog,
    editedFileLog,
    createdFileLog,
    deletedFileLog,
    switchedActiveFileLog,
    newSession,
  }
}