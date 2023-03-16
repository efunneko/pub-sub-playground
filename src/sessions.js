// sessions.js - This file contains all the implementation for managing sessions
//               Sessions are used to store the state of the world. They can be
//               saved to a file, loaded from a file, or loaded from a URL. They
//               are stored in the browser's local storage.


export class Sessions {
  constructor(app) {
    this.app = app;
    this.sessions = [];
    this.undoStack = [];
    this.currentSession = null;

    this.loadSessions();

  }

  loadSessions() {
    let sessions = localStorage.getItem('sessions');
    if (sessions) {
      this.sessions = JSON.parse(sessions);
    }
    else {
      this.sessions = [];
    }
  }

  saveSessions() {
    localStorage.setItem('sessions', JSON.stringify(this.sessions));
  }

  saveSession(name, sessionConfig) {
    let session = {
      name: name,
      config: sessionConfig,
    };
    this.sessions.push(session);
    this.saveSessions();
  }

  // Returns the session config if found, otherwise null
  loadSession(name) {
    let session = this.sessions.find(s => s.name === name);
    if (session) {
      this.currentSession = session;
      return session.config;
    }
    return null;
  }

  getSessionNames() {
    return this.sessions.map(s => s.name);
  }

  deleteSession(name) {
    this.sessions = this.sessions.filter(s => s.name !== name);
    this.saveSessions();
  }

  getCurrentSessionName() {
    if (this.currentSession) {
      return this.currentSession.name;
    }
    return null;
  }

  getCurrentSessionConfig() {
    if (this.currentSession) {
      return this.currentSession.config;
    }
    return null;
  }

  addToUndoStack(config) {
    this.undoStack.push(config);
    if (this.undoStack.length > 30) {
      this.undoStack.shift();      
    }
  }

  getNextUndo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop();
    }
    return this.undoStack[this.undoStack.length - 1];
  }


}

