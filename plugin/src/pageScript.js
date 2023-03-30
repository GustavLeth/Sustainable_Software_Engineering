const beerElement = document.getElementById("beer_equivalent");
const carbonUsedElement = document.getElementById("carbon_equivalent");
const carbonIntensityElement = document.getElementById("carbon_intensity");
const resetButton = document.getElementById("reset_button");
const transferConstant = 0.81/1024**3; // [kWh/byte] Use same conversion factor as websitecarbon.com.

const resetOnClick = () => {
  console.log("reset");
  chrome.runtime.sendMessage({ action: 'reset' });
};

const readFromStorage = async() => {
  let localIntensity = 0;
  chrome.storage.local.get("localIntensity").then((result) => {
    if(result?.intensity) {
      localIntensity = result.intensity;
      carbonIntensityElement.textContent = localIntensity;
    }
  });
  chrome.storage.local.get("storageKey").then((result) => {
    if(result?.storageKey && result.storageKey != "[]]") {
      const requestMap = new Map(JSON.parse(result.storageKey));
      // casts the map to an array and then uses reduce.
      const Co2Consumed = Array.from(requestMap.values()).reduce((accumalator, currentValue) => {
        return accumalator + (currentValue.intensity ?? 1) * currentValue.size * transferConstant;
      }, 0);
      beerElement.textContent = (Co2Consumed/250.0).toFixed(3) ?? 0;
      carbonUsedElement.textContent = Co2Consumed.toFixed(3);
    }
  });
};
resetButton.onclick = () => resetOnClick();
readFromStorage();
setInterval(readFromStorage, 500);
