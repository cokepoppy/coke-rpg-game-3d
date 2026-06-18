const AUDIT_FILENAME = "cutscene-simulator-audit.json";

function recordCutsceneDiagnostic(event, audit = {}) {
  const snapshot = {
    event,
    audit,
    updatedAt: Date.now()
  };

  try {
    wx.setStorageSync?.("cangshan-cutscene-audit", snapshot);
  } catch (error) {
    console.warn?.("[cutscene] failed to persist storage audit", error);
  }

  try {
    const userDataPath = wx.env?.USER_DATA_PATH;
    const fileSystem = wx.getFileSystemManager?.();
    if (!userDataPath || !fileSystem?.writeFileSync) return snapshot;
    fileSystem.writeFileSync(`${userDataPath}/${AUDIT_FILENAME}`, JSON.stringify(snapshot, null, 2), "utf8");
  } catch (error) {
    console.warn?.("[cutscene] failed to persist file audit", error);
  }

  return snapshot;
}

module.exports = { AUDIT_FILENAME, recordCutsceneDiagnostic };
