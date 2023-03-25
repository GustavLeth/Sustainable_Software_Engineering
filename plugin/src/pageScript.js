const beerElement = document.getElementById("beer_equivalent");
const carbonUsedElement = document.getElementById("carbon_equivalent");
const carbonIntensityElement = document.getElementById("carbon_intensity");
const resetButton = document.getElementById("reset_button");
const uploadConstant = 0.81/1024**3; // [kWh/byte] Use same conversion factor as websitecarbon.com.
const downloadConstant = 0.81/1024**3; // [kWh/byte] Same for now!

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
    if (result?.storageKey && result.storageKey != "{]") {
      console.log('result.storageKey', result.storageKey)
    const requestMap = new Map(JSON.parse(result.storageKey));
    console.log('requestMap', requestMap);
    const mapIterator = requestMap.values();
    let Co2Consumed = 0;
    while(true) {
      const next = mapIterator.next().value;
      if (!next) {
        break;
      }
      Co2Consumed += ((next.intensity ?? 1) * next.size * uploadConstant) + ((localIntensity ?? 1) * next.size * downloadConstant); // [gCO2equiv]
    }
    beerElement.textContent = Co2Consumed/250.0 ?? 0;
    carbonUsedElement.textContent = Co2Consumed;
    }
  });
};

resetButton.onclick = () => resetOnClick();
// triggers first so it's there when the user clicks it.
readFromStorage();
setInterval(readFromStorage, 500);


