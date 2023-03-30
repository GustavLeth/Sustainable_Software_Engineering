const beerElement = document.getElementById("beer_equivalent");
const carbonUsedElement = document.getElementById("carbon_equivalent");
const latestOriginIntensity = document.getElementById("carbon_intensity");
const resetButton = document.getElementById("reset_button");
const transferConstant = 0.81/1024**3; // [kWh/byte] Use same conversion factor as websitecarbon.com.

const resetOnClick = () => {
  chrome.runtime.sendMessage({ action: 'reset' });
};

const getColorCode = (number) => {
    if (number <= 100)
      return "#99f182";
    if (number <= 200)
      return "#ccf853";
    if (number <= 300)
      return "#f8fe40";
    if (number <= 400)
      return "#ffea3b";
    if (number <= 500)
      return "#ffd436";
    if (number <= 600)
      return "#ffb02f";
    if (number <= 700)
      return "#ff9d2a";
    if (number <= 800)
      return "#ff5e23";
    
    return "#ff0e1e";
  }

const readFromStorage = async() => {
  let requestMap;
  chrome.storage.local.get("storageKey").then((result) => {
    if(result?.storageKey && result.storageKey != "[]]") {
      requestMap = new Map(JSON.parse(result.storageKey));
      // casts the map to an array and then uses reduce.
      const Co2Consumed = Array.from(requestMap.values()).reduce((accumalator, currentValue) => {
        return accumalator + (currentValue.intensity ?? 1) * currentValue.size * transferConstant;
      }, 0);
      beerElement.textContent = (Co2Consumed/250.0).toFixed(3) ?? 0;
      carbonUsedElement.textContent = Co2Consumed.toFixed(3);
    }
  });
  chrome.storage.local.get("latestOrigin").then((result) => {
    const latestOrigin = result.latestOrigin ?? "";
    const intensityOfOrigin = requestMap.get(latestOrigin)?.intensity ?? 0;
    if(latestOrigin && intensityOfOrigin) {
      latestOriginIntensity.textContent = latestOrigin + " is " + intensityOfOrigin;
      const intensityColor = getColorCode(intensityOfOrigin);
      latestOriginIntensity.style.color = intensityColor;
    }
  });
  };
resetButton.onclick = () => resetOnClick();
readFromStorage();
setInterval(readFromStorage, 500);
