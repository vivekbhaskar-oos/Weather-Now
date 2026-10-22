const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const REVERSE_GEOCODING_BASE =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";
const COUNTRY_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#city-search"),
  citySuggestions: document.querySelector("#city-suggestions"),
  suggestionQueryStatus: document.querySelector("#suggestion-query-status"),
  suggestionList: document.querySelector("#suggestion-list"),
  unitToggle: document.querySelector("#unit-toggle"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeLabel: document.querySelector("#theme-label"),
  locationButton: document.querySelector("#location-button"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackStatus: document.querySelector("#feedback-status"),
  cityName: document.querySelector("#city-name"),
  currentDate: document.querySelector("#current-date"),
  currentIcon: document.querySelector("#current-icon"),
  currentTemperature: document.querySelector("#current-temperature"),
  currentCondition: document.querySelector("#current-condition"),
  feelsLike: document.querySelector("#feels-like"),
  humidity: document.querySelector("#humidity"),
  windSpeed: document.querySelector("#wind-speed"),
  pressure: document.querySelector("#pressure"),
  visibility: document.querySelector("#visibility"),
  hourlyForecast: document.querySelector("#hourly-forecast"),
  dailyForecast: document.querySelector("#daily-forecast"),
  aqiNumber: document.querySelector("#aqi-number"),
  aqiLabel: document.querySelector("#aqi-label"),
  aqiDescription: document.querySelector("#aqi-description"),
  sunrise: document.querySelector("#sunrise"),
  sunset: document.querySelector("#sunset"),
  uvIndex: document.querySelector("#uv-index"),
  rainChance: document.querySelector("#rain-chance"),
  statusMessage: document.querySelector("#status-message"),
  weatherMap: document.querySelector("#weather-map"),
  fullMapLink: document.querySelector("#full-map-link"),
  countrySearch: document.querySelector("#country-search"),
  countryList: document.querySelector("#country-list"),
  countryCount: document.querySelector("#country-count"),
  selectedCountry: document.querySelector("#selected-country"),
  globe: document.querySelector("#world-globe"),
  globeStatus: document.querySelector("#globe-status"),
};

const globeContext = elements.globe.getContext("2d");

let isCelsius = true;
let isDarkTheme = false;
let latestWeather = null;
let requestNumber = 0;
let suggestionTimer;
let suggestionRequestNumber = 0;
let suggestedPlaces = [];
let activeSuggestionIndex = -1;
let preferredCountryCode = "IN";

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Light rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy rain showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Heavy thunderstorm", "⛈️"],
};

const COUNTRIES = `Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo (Democratic Republic)|Congo (Republic)|Costa Rica|Côte d’Ivoire|Croatia|Cuba|Cyprus|Czechia|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe`
  .split("|")
  .sort((first, second) => first.localeCompare(second));

let selectedCountryName = "";
let globeCountries = [];
let globeRotation = { longitude: -20, latitude: 10 };
let globeDrag = null;
let globeFrame = 0;

function normalizeCountryName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getCountryName(feature) {
  return (
    feature.properties.ADMIN ||
    feature.properties.NAME ||
    feature.properties.name ||
    ""
  );
}

function getCountryCentroid(feature) {
  if (!feature.geometry) return null;
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  let outerRing = [];
  for (const polygon of polygons) {
    if (polygon[0] && polygon[0].length > outerRing.length) {
      outerRing = polygon[0];
    }
  }
  if (outerRing.length === 0) return null;

  let longitudeX = 0;
  let longitudeY = 0;
  let latitude = 0;
  for (const [longitude, pointLatitude] of outerRing) {
    const radians = (longitude * Math.PI) / 180;
    longitudeX += Math.cos(radians);
    longitudeY += Math.sin(radians);
    latitude += pointLatitude;
  }

  return {
    longitude: (Math.atan2(longitudeY, longitudeX) * 180) / Math.PI,
    latitude: latitude / outerRing.length,
  };
}

function projectGlobePoint(longitude, latitude, centerX, centerY, radius) {
  const longitudeRadians =
    ((longitude - globeRotation.longitude) * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const centerLatitude = (globeRotation.latitude * Math.PI) / 180;
  const horizontal = Math.cos(latitudeRadians) * Math.sin(longitudeRadians);
  const vertical = Math.sin(latitudeRadians);
  const depth = Math.cos(latitudeRadians) * Math.cos(longitudeRadians);
  const rotatedVertical =
    vertical * Math.cos(centerLatitude) - depth * Math.sin(centerLatitude);
  const rotatedDepth =
    vertical * Math.sin(centerLatitude) + depth * Math.cos(centerLatitude);

  return {
    x: centerX + radius * horizontal,
    y: centerY - radius * rotatedVertical,
    depth: rotatedDepth,
  };
}

function traceVisibleGlobeLine(context, points, centerX, centerY, radius) {
  let previousVisible = false;
  for (const [longitude, latitude] of points) {
    const point = projectGlobePoint(
      longitude,
      latitude,
      centerX,
      centerY,
      radius,
    );
    if (point.depth > 0) {
      if (!previousVisible) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    previousVisible = point.depth > 0;
  }
}

function traceGlobeRing(context, ring, centerX, centerY, radius) {
  let pathOpen = false;
  let previousVisible = false;

  for (let index = 0; index < ring.length; index += 1) {
    const [longitude, latitude] = ring[index];
    const point = projectGlobePoint(
      longitude,
      latitude,
      centerX,
      centerY,
      radius,
    );
    const visible = point.depth > 0;

    if (visible) {
      if (!previousVisible || !pathOpen) {
        context.moveTo(point.x, point.y);
        pathOpen = true;
      } else {
        context.lineTo(point.x, point.y);
      }
    } else {
      pathOpen = false;
    }
    previousVisible = visible;
  }
}

function drawGlobe() {
  const canvas = elements.globe;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.round(bounds.width * pixelRatio);
  const height = Math.round(bounds.height * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = globeContext;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2 - 4);

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();

  const ocean = context.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.4,
    radius * 0.05,
    centerX,
    centerY,
    radius * 1.35,
  );
  ocean.addColorStop(0, "#64c7ef");
  ocean.addColorStop(1, "#14548f");
  context.fillStyle = ocean;
  context.fillRect(0, 0, bounds.width, bounds.height);

  context.strokeStyle = "rgba(225, 248, 255, 0.22)";
  context.lineWidth = 0.7;
  for (const latitude of [-60, -30, 0, 30, 60]) {
    context.beginPath();
    const points = [];
    for (let longitude = 0; longitude <= 360; longitude += 3) {
      points.push([longitude - 180, latitude]);
    }
    traceVisibleGlobeLine(context, points, centerX, centerY, radius);
    context.stroke();
  }
  for (const offset of [-60, -30, 0, 30, 60]) {
    context.beginPath();
    const points = [];
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      points.push([globeRotation.longitude + offset, latitude]);
    }
    traceVisibleGlobeLine(context, points, centerX, centerY, radius);
    context.stroke();
  }

  context.beginPath();
  for (const country of globeCountries) {
    const polygons =
      country.feature.geometry.type === "Polygon"
        ? [country.feature.geometry.coordinates]
        : country.feature.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        traceGlobeRing(context, ring, centerX, centerY, radius);
      }
    }
  }
  context.strokeStyle = "rgba(225, 255, 222, 0.85)";
  context.lineWidth = 0.65;
  context.stroke();

  const labelPositions = [];
  for (const country of globeCountries) {
    const point = projectGlobePoint(
      country.longitude,
      country.latitude,
      centerX,
      centerY,
      radius,
    );
    if (point.depth < 0.2) continue;

    const isSelected = country.name === selectedCountryName;
    const fontSize = Math.max(7, Math.min(10, radius * 0.075));
    context.font = `${isSelected ? 700 : 500} ${fontSize}px "DM Sans", sans-serif`;
    const labelWidth = context.measureText(country.name).width;
    const labelBox = {
      left: point.x - labelWidth / 2 - 3,
      right: point.x + labelWidth / 2 + 3,
      top: point.y - fontSize - 2,
      bottom: point.y + 3,
    };
    if (
      !isSelected &&
      labelPositions.some(
        (placed) =>
          labelBox.left < placed.right + 2 &&
          labelBox.right > placed.left - 2 &&
          labelBox.top < placed.bottom + 2 &&
          labelBox.bottom > placed.top - 2,
      )
    ) {
      continue;
    }

    labelPositions.push(labelBox);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${isSelected ? 700 : 500} ${fontSize}px "DM Sans", sans-serif`;
    context.lineWidth = 2.5;
    context.strokeStyle = "rgba(8, 32, 52, 0.85)";
    context.strokeText(country.name, point.x, point.y);
    context.fillStyle = isSelected ? "#fff2a8" : "#fff";
    context.fillText(country.name, point.x, point.y);
  }

  context.restore();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255, 255, 255, 0.65)";
  context.lineWidth = 1.5;
  context.stroke();
}

function queueGlobeDraw() {
  if (globeFrame) return;
  globeFrame = window.requestAnimationFrame(() => {
    globeFrame = 0;
    drawGlobe();
  });
}

function findGlobeCountry(name) {
  const normalizedName = normalizeCountryName(name);
  const aliases = {
    congodemocraticrepublic: ["democraticrepublicofthecongo", "drcongo"],
    congorepublic: ["republicofthecongo", "congobrazzaville"],
    coteivoire: ["ivorycoast"],
    czechia: ["czechrepublic"],
    palau: ["palau"],
    palestine: ["stateofpalestine"],
    russia: ["russianfederation"],
    southkorea: ["republicofkorea", "korearepublicof", "southkorea"],
    northkorea: ["democraticpeoplesrepublicofkorea", "koreademocraticpeoplesrepublicof"],
    tanzania: ["unitedrepublicoftanzania"],
    thegambia: ["gambia"],
    turkey: ["turkiye"],
    turkiye: ["turkey"],
    unitedstates: ["unitedstatesofamerica"],
    vietnam: ["vietnam"],
  };
  const candidates = [normalizedName, ...(aliases[normalizedName] || [])];
  return globeCountries.find((country) =>
    candidates.includes(normalizeCountryName(country.name)),
  );
}

function loadCountryGeography() {
  fetch(COUNTRY_GEOJSON_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Country map returned ${response.status}.`);
      }
      return response.json();
    })
    .then((geoJson) => {
      globeCountries = geoJson.features
        .map((feature) => {
          const centroid = getCountryCentroid(feature);
          return centroid
            ? { feature, name: getCountryName(feature), ...centroid }
            : null;
        })
        .filter((country) => country && country.name);
      if (globeCountries.length === 0) {
        throw new Error("Country borders were missing from the map data.");
      }
      elements.globeStatus.textContent =
        "Drag to rotate; country names appear on the front of the globe.";
      drawGlobe();
    })
    .catch((error) => {
      elements.globeStatus.textContent =
        `Country names could not be loaded: ${error.message}`;
    });
}

function renderCountries(query = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = COUNTRIES.filter((country) =>
    country.toLocaleLowerCase().includes(normalizedQuery),
  );
  const fragment = document.createDocumentFragment();

  matches.forEach((country) => {
    const option = document.createElement("button");
    option.className = "country-option";
    option.type = "button";
    option.setAttribute("role", "option");
    option.setAttribute(
      "aria-selected",
      String(country === selectedCountryName),
    );
    option.dataset.country = country;
    option.textContent = country;
    fragment.append(option);
  });

  if (matches.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "country-empty";
    emptyMessage.textContent = "No countries found.";
    fragment.append(emptyMessage);
  }

  elements.countryList.replaceChildren(fragment);
  elements.countryCount.textContent =
    matches.length === COUNTRIES.length
      ? `${COUNTRIES.length} countries`
      : `${matches.length} of ${COUNTRIES.length} countries`;
}

function getWeatherDescription(code) {
  return WEATHER_CODES[code] || ["Weather conditions", "🌤️"];
}

function formatTemperature(value) {
  if (!Number.isFinite(value)) return "--";
  const converted = isCelsius ? value : (value * 9) / 5 + 32;
  return `${Math.round(converted)}°${isCelsius ? "C" : "F"}`;
}

function formatTemperatureNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return Math.round(isCelsius ? value : (value * 9) / 5 + 32);
}

function formatTime(time) {
  if (!time) return "--:--";
  const [hours, minutes] = time.split("T").at(-1).split(":");
  const hour = Number(hours);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minutes} ${suffix}`;
}

function formatHour(time) {
  const hour = Number(time.split("T").at(-1).split(":")[0]);
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

function getWindDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % directions.length];
}

function getDayName(date, index, timeZone) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(new Date(`${date}T12:00:00`));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status}. Please try again.`);
  }
  return response.json();
}

function getPlaceDetails(place) {
  return [place.admin2, place.admin1, place.country]
    .filter((value, index, parts) => value && parts.indexOf(value) === index)
    .join(", ");
}

function getLocationLabel(location) {
  const parts = [location.name, location.admin2, location.admin1, location.country]
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) =>
            normalizePlaceName(candidate) === normalizePlaceName(value),
        ) === index,
    );
  return parts.join(", ");
}

function normalizePlaceName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function getEditDistance(first, second) {
  const previousRow = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );

  for (let row = 1; row <= first.length; row += 1) {
    let diagonal = previousRow[0];
    previousRow[0] = row;
    for (let column = 1; column <= second.length; column += 1) {
      const previous = previousRow[column];
      previousRow[column] = Math.min(
        previousRow[column] + 1,
        previousRow[column - 1] + 1,
        diagonal + (first[row - 1] === second[column - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return previousRow[second.length];
}

function getExtraLetterCorrections(query) {
  const corrections = new Set();
  for (let index = 0; index < query.length; index += 1) {
    corrections.add(`${query.slice(0, index)}${query.slice(index + 1)}`);
  }
  return [...corrections].filter((correction) => correction.length >= 3);
}

function hasMatchingPlaceName(query, places) {
  const normalizedQuery = normalizePlaceName(query);
  return places.some((place) => {
    const normalizedName = normalizePlaceName(place.suggestionName || place.name);
    return (
      normalizedQuery === normalizedName ||
      normalizedQuery.startsWith(`${normalizedName} `)
    );
  });
}

function getPlaceType(place) {
  const type = String(place.placeType || "").toLowerCase();
  if (type === "district") return "District";

  const normalizedName = normalizePlaceName(place.name);
  const normalizedDistrict = normalizePlaceName(place.admin2 || "");
  if (
    place.countryCode === "IN" &&
    normalizedDistrict.includes("district") &&
    normalizedDistrict.startsWith(normalizedName)
  ) {
    return "District / city";
  }

  const placeTypes = {
    hamlet: "Hamlet",
    village: "Village",
    isolated_dwelling: "Small settlement",
    locality: "Locality",
    residential: "Village / local area",
    neighbourhood: "Neighbourhood",
    quarter: "Neighbourhood",
    suburb: "Suburb",
    town: "Town",
    city: "City",
    district: "District",
    ppl: "Populated place",
    pplx: "Settlement",
    pplc: "Capital city",
    ppla: "City / administrative centre",
  };
  return (
    placeTypes[type] ||
    (type.startsWith("ppla") ? "Administrative centre" : "") ||
    (/^ppl[a-z0-9]*$/.test(type) ? "Populated place" : "") ||
    (type ? type.replaceAll("_", " ") : "Place")
  );
}

function closeSuggestions() {
  elements.citySuggestions.hidden = true;
  elements.suggestionQueryStatus.hidden = true;
  elements.suggestionQueryStatus.textContent = "";
  elements.suggestionList.replaceChildren();
  elements.searchInput.setAttribute("aria-expanded", "false");
  elements.searchInput.removeAttribute("aria-activedescendant");
  suggestedPlaces = [];
  activeSuggestionIndex = -1;
}

function showSuggestionMessage(message) {
  suggestedPlaces = [];
  activeSuggestionIndex = -1;
  elements.suggestionQueryStatus.hidden = true;
  elements.searchInput.removeAttribute("aria-activedescendant");
  elements.suggestionList.replaceChildren();
  const item = document.createElement("div");
  item.className = "suggestion-message";
  item.textContent = message;
  elements.suggestionList.append(item);
  elements.citySuggestions.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
}

function renderSuggestions(places, query) {
  suggestedPlaces = places;
  activeSuggestionIndex = -1;
  elements.suggestionList.replaceChildren();
  const hasExactMatch = hasMatchingPlaceName(query, places);
  elements.suggestionQueryStatus.textContent = hasExactMatch
    ? ""
    : `No exact match for “${query}”. Similar place names are shown below; check the country or region.`;
  elements.suggestionQueryStatus.hidden = hasExactMatch;

  if (places.length === 0) {
    showSuggestionMessage(
      query.length === 2
        ? "Type one more letter to find cities and districts."
        : "No matching places found. Check the spelling or try a nearby city or district.",
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  places.forEach((place, index) => {
    const option = document.createElement("button");
    option.className = "city-suggestion";
    option.id = `city-suggestion-${index}`;
    option.type = "button";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.index = String(index);

    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = place.suggestionName || place.name;

    const details = document.createElement("span");
    details.className = "suggestion-details";
    const placeDetails = getPlaceDetails(place);
    details.textContent = placeDetails
      ? `${getPlaceType(place)} · ${placeDetails}`
      : getPlaceType(place);

    option.append(name, details);
    fragment.append(option);
  });

  elements.suggestionList.append(fragment);
  elements.citySuggestions.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
}

async function getPlaceSuggestions(query) {
  const getGeocodingResults = async (searchName) => {
    const params = new URLSearchParams({
      name: searchName,
      count: "100",
      language: "en",
      format: "json",
    });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Place search timed out. Please try again.")),
      8000,
    );
    try {
      const result = await fetchJson(`${GEOCODING_BASE}?${params}`, {
        signal: controller.signal,
      });
      return (result.results || []).map((place) => ({
        name: place.name,
        country: place.country || "",
        countryCode: String(place.country_code || "").toUpperCase(),
        admin1: place.admin1 || "",
        admin2: place.admin2 || "",
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.feature_code || "",
        source: "Open-Meteo",
      }));
    } finally {
      clearTimeout(timeout);
    }
  };

  let geocodingPlaces = await getGeocodingResults(query);
  const districtSearchName = query.replace(/\s+district$/i, "").trim();
  if (geocodingPlaces.length === 0 && districtSearchName !== query) {
    geocodingPlaces = await getGeocodingResults(districtSearchName);
  }

  if (geocodingPlaces.length === 0 && query.length >= 5) {
    const corrections = getExtraLetterCorrections(query);
    const correctionResults = await Promise.allSettled(
      corrections.map((correction) => getGeocodingResults(correction)),
    );
    geocodingPlaces = correctionResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter(
        (place) =>
          getEditDistance(
            normalizePlaceName(query),
            normalizePlaceName(place.name),
          ) <= 1,
      );
  }

  const uniquePlaces = new Map();

  const districtPlaces = new Map();
  for (const place of geocodingPlaces) {
    const districtName = place.admin2.trim();
    if (
      !/\s+district$/i.test(districtName) ||
      normalizePlaceName(districtName.replace(/\s+district$/i, "")) !==
        normalizePlaceName(place.name)
    ) {
      continue;
    }

    const district = {
      ...place,
      suggestionName: districtName,
      admin2: districtName,
      placeType: "district",
    };
    const districtKey = [
      district.name.toLocaleLowerCase(),
      district.country.toLocaleLowerCase(),
      district.admin1.toLocaleLowerCase(),
    ].join("|");
    if (!districtPlaces.has(districtKey)) {
      districtPlaces.set(districtKey, district);
    }
  }

  for (const place of [...geocodingPlaces, ...districtPlaces.values()]) {
    const placeKey = [
      place.name.toLocaleLowerCase(),
      (place.suggestionName || "").toLocaleLowerCase(),
      place.country.toLocaleLowerCase(),
      place.admin2.toLocaleLowerCase(),
      place.latitude.toFixed(3),
      place.longitude.toFixed(3),
    ].join("|");
    if (!uniquePlaces.has(placeKey)) uniquePlaces.set(placeKey, place);
  }
  return [...uniquePlaces.values()].sort((first, second) => {
    const queryName = normalizePlaceName(query);
    const firstName = normalizePlaceName(first.suggestionName || first.name);
    const secondName = normalizePlaceName(second.suggestionName || second.name);
    const firstExact = firstName === queryName;
    const secondExact = secondName === queryName;
    const firstMatches = firstName === queryName || queryName.startsWith(`${firstName} `);
    const secondMatches =
      secondName === queryName || queryName.startsWith(`${secondName} `);
    return (
      Number(secondExact) - Number(firstExact) ||
      Number(secondMatches) - Number(firstMatches) ||
      Number(second.countryCode === preferredCountryCode) -
        Number(first.countryCode === preferredCountryCode)
    );
  });
}

async function updateSuggestions(query) {
  const currentSuggestionRequest = ++suggestionRequestNumber;
  showSuggestionMessage("Searching places…");

  try {
    const places = await getPlaceSuggestions(query);
    if (
      currentSuggestionRequest !== suggestionRequestNumber ||
      elements.searchInput.value.trim() !== query
    ) {
      return;
    }
    renderSuggestions(places, query);
  } catch (error) {
    if (
      currentSuggestionRequest === suggestionRequestNumber &&
      elements.searchInput.value.trim() === query
    ) {
      showSuggestionMessage(error.message);
    }
  }
}

function setActiveSuggestion(index) {
  if (suggestedPlaces.length === 0) return;
  activeSuggestionIndex =
    (index + suggestedPlaces.length) % suggestedPlaces.length;
  const options = elements.suggestionList.querySelectorAll(".city-suggestion");
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === activeSuggestionIndex;
    option.setAttribute("aria-selected", String(isActive));
    if (isActive) {
      elements.searchInput.setAttribute(
        "aria-activedescendant",
        option.id,
      );
      option.scrollIntoView({ block: "nearest" });
    }
  });
}

function selectSuggestion(place) {
  if (!place) return;
  clearTimeout(suggestionTimer);
  suggestionRequestNumber += 1;
  if (place.countryCode) preferredCountryCode = place.countryCode;
  elements.searchInput.value = "";
  closeSuggestions();
  loadWeather({
    name: place.name,
    country: place.country,
    admin1: place.admin1,
    admin2: place.admin2,
    latitude: place.latitude,
    longitude: place.longitude,
  });
}

function updateMap(latitude, longitude) {
  const padding = 0.12;
  const bbox = [
    longitude - padding,
    latitude - padding,
    longitude + padding,
    latitude + padding,
  ]
    .map((coordinate) => coordinate.toFixed(4))
    .join(",");
  const coordinates = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  elements.weatherMap.src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}` +
    `&layer=mapnik&marker=${encodeURIComponent(coordinates)}`;
  elements.fullMapLink.href =
    `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}` +
    `#map=11/${latitude}/${longitude}`;
}

function renderWeather(location, weather) {
  const { current, hourly, daily } = weather;
  const [description, icon] = getWeatherDescription(current.weather_code);
  const timezone = weather.timezone || "UTC";
  const localDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date());

  elements.cityName.textContent = getLocationLabel(location);
  elements.currentDate.textContent = localDate;
  elements.currentIcon.textContent = icon;
  elements.currentCondition.textContent = description;
  elements.currentTemperature.innerHTML =
    `${formatTemperatureNumber(current.temperature_2m)}<span>°${isCelsius ? "C" : "F"}</span>`;
  elements.feelsLike.textContent = `Feels like ${formatTemperature(current.apparent_temperature)}`;
  elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  const windSpeed = isCelsius
    ? `${Math.round(current.wind_speed_10m)} km/h`
    : `${Math.round(current.wind_speed_10m / 1.609)} mph`;
  elements.windSpeed.textContent =
    `${windSpeed} ${getWindDirection(current.wind_direction_10m)}`;
  elements.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
  elements.visibility.textContent = isCelsius
    ? `${(current.visibility / 1000).toFixed(1)} km`
    : `${(current.visibility / 1609.344).toFixed(1)} mi`;

  renderHourlyForecast(hourly, current.time);
  renderDailyForecast(daily, timezone);
  renderDetails(daily);
  updateMap(location.latitude, location.longitude);
}

function renderHourlyForecast(hourly, currentTime) {
  let startIndex = hourly.time.findIndex((time) => time === currentTime);
  if (startIndex < 0) {
    startIndex = hourly.time.findIndex((time) => new Date(time) >= new Date(currentTime));
  }
  if (startIndex < 0) startIndex = 0;

  const items = [];
  for (let offset = 0; offset < 6; offset += 1) {
    const index = startIndex + offset;
    if (index >= hourly.time.length) break;
    const [, icon] = getWeatherDescription(hourly.weather_code[index]);
    items.push(
      `<div class="hour-item">
        <span class="hour-time">${offset === 0 ? "Now" : formatHour(hourly.time[index])}</span>
        <span class="hour-icon" aria-hidden="true">${icon}</span>
        <span class="hour-temp">${formatTemperature(hourly.temperature_2m[index])}</span>
      </div>`,
    );
  }
  elements.hourlyForecast.innerHTML = items.join("");
}

function renderDailyForecast(daily, timezone) {
  elements.dailyForecast.innerHTML = daily.time
    .map((date, index) => {
      const [description, icon] = getWeatherDescription(daily.weather_code[index]);
      return `<div class="day-item" aria-label="${getDayName(date, index, timezone)}: ${description}, high ${formatTemperature(daily.temperature_2m_max[index])}, low ${formatTemperature(daily.temperature_2m_min[index])}">
        <span class="day-name">${getDayName(date, index, timezone)}</span>
        <span class="day-icon" aria-hidden="true">${icon}</span>
        <span class="day-high">${formatTemperature(daily.temperature_2m_max[index])}</span>
        <span class="day-low">${formatTemperature(daily.temperature_2m_min[index])}</span>
      </div>`;
    })
    .join("");
}

function renderDetails(daily) {
  elements.sunrise.textContent = formatTime(daily.sunrise[0]);
  elements.sunset.textContent = formatTime(daily.sunset[0]);
  elements.uvIndex.textContent = Number(daily.uv_index_max[0]).toFixed(1);
  elements.rainChance.textContent = `${Math.round(daily.precipitation_probability_max[0])}%`;
}

function renderAirQuality(airQuality) {
  const aqi = airQuality.current.us_aqi;
  let label = "Very Unhealthy";
  let background = "#bd3f51";
  if (aqi <= 50) {
    label = "Good";
    background = "#58b976";
  } else if (aqi <= 100) {
    label = "Moderate";
    background = "#d6a938";
  } else if (aqi <= 150) {
    label = "Unhealthy for sensitive groups";
    background = "#df873c";
  } else if (aqi <= 200) {
    label = "Unhealthy";
    background = "#c85556";
  } else if (aqi > 300) {
    label = "Hazardous";
    background = "#7c4e8c";
  }

  elements.aqiNumber.textContent = Math.round(aqi);
  elements.aqiNumber.style.backgroundColor = background;
  elements.aqiLabel.textContent = label;
  elements.aqiDescription.textContent = "US Air Quality Index";
}

async function loadWeather(location) {
  const currentRequest = ++requestNumber;
  elements.statusMessage.textContent = "Loading weather…";
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,visibility",
    hourly: "temperature_2m,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });

  try {
    const weather = await fetchJson(`${API_BASE}?${params}`);
    if (currentRequest !== requestNumber) return;

    latestWeather = { location, weather };
    renderWeather(location, weather);
    elements.statusMessage.textContent = "";
    closeSuggestions();
    elements.aqiNumber.textContent = "…";
    elements.aqiNumber.style.backgroundColor = "#58b976";
    elements.aqiLabel.textContent = "Checking air quality";
    elements.aqiDescription.textContent = "Local air quality information";

    const airParams = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      current: "us_aqi",
      timezone: "auto",
    });
    try {
      const airQuality = await fetchJson(`${AIR_QUALITY_BASE}?${airParams}`);
      if (currentRequest === requestNumber) renderAirQuality(airQuality);
    } catch {
      if (currentRequest === requestNumber) {
        elements.aqiNumber.textContent = "—";
        elements.aqiNumber.style.backgroundColor = "#77879a";
        elements.aqiLabel.textContent = "Unavailable";
        elements.aqiDescription.textContent = "Air quality data could not be loaded";
      }
    }
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    elements.statusMessage.textContent = error.message;
    elements.currentCondition.textContent = "Weather data unavailable";
    elements.hourlyForecast.innerHTML =
      '<span class="loading-note">Hourly forecast could not be loaded.</span>';
    elements.dailyForecast.innerHTML =
      '<span class="loading-note">Forecast could not be loaded.</span>';
  }
}

async function loadCountryWeather(countryName) {
  if (!countryName) return;

  const countryRequest = ++requestNumber;
  elements.statusMessage.textContent = `Finding weather for ${countryName}…`;
  const country = findGlobeCountry(countryName);

  try {
    let location;
    if (country) {
      location = {
        name: countryName,
        country: "",
        latitude: country.latitude,
        longitude: country.longitude,
      };
    } else {
      const params = new URLSearchParams({
        name: countryName,
        count: "10",
        language: "en",
        format: "json",
      });
      const result = await fetchJson(`${GEOCODING_BASE}?${params}`);
      if (countryRequest !== requestNumber) return;

      const place = (result.results || []).find(
        (candidate) =>
          normalizeCountryName(candidate.name) ===
            normalizeCountryName(countryName) ||
          normalizeCountryName(candidate.country || "") ===
            normalizeCountryName(countryName),
      );
      if (!place) {
        throw new Error(`Could not find a weather location for ${countryName}.`);
      }
      location = {
        name: countryName,
        country: "",
        latitude: place.latitude,
        longitude: place.longitude,
      };
    }

    if (countryRequest === requestNumber) await loadWeather(location);
  } catch (error) {
    if (countryRequest === requestNumber) {
      elements.statusMessage.textContent = error.message;
    }
  }
}

async function searchCity(city) {
  const currentRequest = ++requestNumber;
  suggestionRequestNumber += 1;
  closeSuggestions();
  elements.statusMessage.textContent = `Searching for ${city}…`;

  try {
    const places = await getPlaceSuggestions(city);
    if (
      currentRequest !== requestNumber ||
      elements.searchInput.value.trim() !== city
    ) {
      return;
    }
    const place = places[0];
    if (places.length === 0) {
      elements.statusMessage.textContent = `No matching place found for “${city}”. Try another name.`;
      return;
    }

    if (!hasMatchingPlaceName(city, places)) {
      elements.statusMessage.textContent = "";
      renderSuggestions(places, city);
      elements.searchInput.focus();
      return;
    }

    const normalizedCity = normalizePlaceName(city);
    const matchingPlace =
      places.find(
        (candidate) =>
          normalizePlaceName(candidate.suggestionName || candidate.name) ===
          normalizedCity,
      ) ||
      places.find((candidate) =>
        normalizedCity.startsWith(
          normalizePlaceName(candidate.suggestionName || candidate.name),
        ),
      ) ||
      place;
    if (matchingPlace.countryCode) {
      preferredCountryCode = matchingPlace.countryCode;
    }
    elements.searchInput.value = "";
    await loadWeather({
      name: matchingPlace.name,
      country: matchingPlace.country,
      admin1: matchingPlace.admin1,
      admin2: matchingPlace.admin2,
      latitude: matchingPlace.latitude,
      longitude: matchingPlace.longitude,
    });
  } catch (error) {
    if (currentRequest === requestNumber) {
      elements.statusMessage.textContent = error.message;
    }
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    elements.currentCondition.textContent = "Search for a place to see its weather";
    elements.statusMessage.textContent = window.isSecureContext
      ? "Location is not supported by this browser. Search for a city instead."
      : "Location requires a secure page. Open this app on HTTPS or localhost, then try again.";
    return;
  }

  const locationRequest = ++requestNumber;
  elements.statusMessage.textContent = "Getting your location…";
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      if (locationRequest !== requestNumber) return;
      const location = {
        name: "Your location",
        country: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      const weatherLoad = loadWeather(location);
      const weatherRequest = requestNumber;
      let locationNameUnavailable = false;

      try {
        const params = new URLSearchParams({
          latitude: coords.latitude,
          longitude: coords.longitude,
          localityLanguage: "en",
        });
        const place = await fetchJson(`${REVERSE_GEOCODING_BASE}?${params}`);
        if (weatherRequest !== requestNumber) return;

        const administrativeAreas = place.localityInfo?.administrative || [];
        const administrativeArea =
          administrativeAreas.find(
            (area) =>
              area.adminLevel === 5 &&
              /district/i.test(area.name),
          ) ||
          administrativeAreas.find((area) => area.adminLevel === 5) ||
          administrativeAreas.find(
            (area) => area.adminLevel >= 6 && area.adminLevel <= 7,
          );
        const name =
          place.city ||
          place.locality ||
          administrativeArea?.name ||
          place.principalSubdivision;

        if (name) {
          location.name = name;
          location.country = place.countryName || "";
          preferredCountryCode =
            String(place.countryCode || "").toUpperCase() ||
            preferredCountryCode;
          location.admin1 = place.principalSubdivision || "";
          location.admin2 =
            administrativeArea?.name !== name ? administrativeArea?.name : "";
          elements.cityName.textContent = getLocationLabel(location);
        } else {
          locationNameUnavailable = true;
        }
      } catch {
        if (weatherRequest !== requestNumber) return;
        locationNameUnavailable = true;
      }

      await weatherLoad;
      if (
        weatherRequest === requestNumber &&
        locationNameUnavailable &&
        !elements.statusMessage.textContent
      ) {
        elements.statusMessage.textContent =
          "Weather is shown for your location, but its city name could not be found.";
      }
    },
    (error) => {
      if (locationRequest !== requestNumber) return;
      elements.currentCondition.textContent =
        "Use search or allow location access";
      let message = "Your location could not be determined. Turn on device location and try again.";
      if (error.code === error.PERMISSION_DENIED) {
        message = window.isSecureContext
          ? "Location permission was denied. Allow location access in your browser settings and try again."
          : "Location needs HTTPS or localhost. Open this app on a secure page and allow location access.";
      } else if (error.code === error.TIMEOUT) {
        message = "Finding your location took too long. Check GPS or network access and try again.";
      }
      elements.statusMessage.textContent = message;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = elements.searchInput.value.trim();
  if (!city) return;

  clearTimeout(suggestionTimer);
  if (suggestedPlaces.length > 0) {
    selectSuggestion(
      suggestedPlaces[
        activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0
      ],
    );
    return;
  }

  if (city.length >= 2) searchCity(city);
});

elements.searchInput.addEventListener("input", () => {
  const query = elements.searchInput.value.trim();
  clearTimeout(suggestionTimer);

  if (query.length < 2) {
    suggestionRequestNumber += 1;
    closeSuggestions();
    return;
  }

  suggestionTimer = setTimeout(() => updateSuggestions(query), 250);
});

elements.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && suggestedPlaces.length > 0) {
    event.preventDefault();
    setActiveSuggestion(activeSuggestionIndex + 1);
  } else if (event.key === "ArrowUp" && suggestedPlaces.length > 0) {
    event.preventDefault();
    setActiveSuggestion(
      activeSuggestionIndex < 0
        ? suggestedPlaces.length - 1
        : activeSuggestionIndex - 1,
    );
  } else if (event.key === "Escape") {
    suggestionRequestNumber += 1;
    closeSuggestions();
  }
});

renderCountries();
drawGlobe();
loadCountryGeography();
new ResizeObserver(queueGlobeDraw).observe(elements.globe);

function setSelectedCountry(countryName) {
  selectedCountryName = countryName;
  elements.selectedCountry.textContent = countryName || "Earth";
  elements.countryList
    .querySelectorAll(".country-option")
    .forEach((option) => {
      option.setAttribute(
        "aria-selected",
        String(option.dataset.country === countryName),
      );
    });
  queueGlobeDraw();
}

function selectCountryAtGlobeCenter() {
  const centeredCountry = globeCountries.reduce(
    (closest, country) => {
      const depth = projectGlobePoint(
        country.longitude,
        country.latitude,
        0,
        0,
        1,
      ).depth;
      return depth > closest.depth ? { country, depth } : closest;
    },
    { country: null, depth: 0 },
  ).country;
  if (centeredCountry) setSelectedCountry(centeredCountry.name);
}

elements.countrySearch.addEventListener("input", () => {
  renderCountries(elements.countrySearch.value);
});

elements.countryList.addEventListener("click", (event) => {
  const option = event.target.closest(".country-option");
  if (!option) return;

  const countryName = option.dataset.country;
  setSelectedCountry(countryName);
  loadCountryWeather(countryName);
  const country = findGlobeCountry(countryName);
  if (country) {
    globeRotation.longitude = country.longitude;
    globeRotation.latitude = country.latitude;
    queueGlobeDraw();
  }
});

elements.globe.addEventListener("pointerdown", (event) => {
  globeDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  elements.globe.setPointerCapture(event.pointerId);
});

elements.globe.addEventListener("pointermove", (event) => {
  if (!globeDrag || globeDrag.pointerId !== event.pointerId) return;
  const bounds = elements.globe.getBoundingClientRect();
  globeRotation.longitude -=
    ((event.clientX - globeDrag.x) / bounds.width) * 180;
  globeRotation.latitude +=
    ((event.clientY - globeDrag.y) / bounds.height) * 180;
  globeRotation.latitude = Math.max(
    -85,
    Math.min(85, globeRotation.latitude),
  );
  globeDrag.x = event.clientX;
  globeDrag.y = event.clientY;
  selectCountryAtGlobeCenter();
  queueGlobeDraw();
});

function endGlobeDrag(event) {
  if (globeDrag?.pointerId !== event.pointerId) return;
  globeDrag = null;
  selectCountryAtGlobeCenter();
  loadCountryWeather(selectedCountryName);
}

elements.globe.addEventListener("pointerup", endGlobeDrag);
elements.globe.addEventListener("pointercancel", (event) => {
  if (globeDrag?.pointerId === event.pointerId) globeDrag = null;
});
elements.globe.addEventListener("keydown", (event) => {
  const rotations = {
    ArrowLeft: [-10, 0],
    ArrowRight: [10, 0],
    ArrowUp: [0, 10],
    ArrowDown: [0, -10],
  };
  const rotation = rotations[event.key];
  if (!rotation) return;

  event.preventDefault();
  globeRotation.longitude -= rotation[0];
  globeRotation.latitude = Math.max(
    -85,
    Math.min(85, globeRotation.latitude + rotation[1]),
  );
  selectCountryAtGlobeCenter();
  loadCountryWeather(selectedCountryName);
  queueGlobeDraw();
});

elements.suggestionList.addEventListener("click", (event) => {
  const option = event.target.closest(".city-suggestion");
  if (!option) return;
  selectSuggestion(suggestedPlaces[Number(option.dataset.index)]);
});

elements.feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const rating = new FormData(elements.feedbackForm).get("rating");
  if (typeof rating !== "string") return;

  const subject = encodeURIComponent("WeatherNow website feedback");
  const body = encodeURIComponent(`My feedback: ${rating}`);
  elements.feedbackStatus.textContent =
    "Opening your email app so you can send this feedback.";
  window.location.href =
    `mailto:vivekaryavivekarya1@gmail.com?subject=${subject}&body=${body}`;
});

document.addEventListener("click", (event) => {
  if (!elements.searchForm.contains(event.target)) {
    suggestionRequestNumber += 1;
    closeSuggestions();
  }
});

elements.unitToggle.addEventListener("click", () => {
  isCelsius = !isCelsius;
  elements.unitToggle.textContent = isCelsius ? "°C" : "°F";
  elements.unitToggle.setAttribute(
    "aria-label",
    `Switch to ${isCelsius ? "Fahrenheit" : "Celsius"}`,
  );
  if (latestWeather) renderWeather(latestWeather.location, latestWeather.weather);
});

elements.themeToggle.addEventListener("click", () => {
  isDarkTheme = !isDarkTheme;
  document.documentElement.dataset.theme = isDarkTheme ? "dark" : "light";
  elements.themeToggle.setAttribute("aria-pressed", String(isDarkTheme));
  elements.themeToggle.setAttribute(
    "aria-label",
    `Switch to ${isDarkTheme ? "light" : "dark"} theme`,
  );
  elements.themeLabel.textContent = isDarkTheme ? "Light" : "Dark";
  elements.themeToggle.querySelector(".theme-icon").textContent = isDarkTheme
    ? "☀"
    : "☾";
});

elements.locationButton.addEventListener("click", useCurrentLocation);
document.querySelector("#footer-year").textContent = new Date().getFullYear();
elements.cityName.textContent = "Your location";
elements.currentDate.textContent = "Allow location access to see local weather";
elements.currentCondition.textContent = "Finding your local forecast";
useCurrentLocation();