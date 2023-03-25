const resetByteTracker = () => {
  console.log("reset");
  requestMap = new Map();
  chrome.storage.local.set({ storageKey: JSON.stringify(new Map()) });
};


const resetButton = document.getElementById("reset_button");
resetButton.onclick = () => resetByteTracker();