const API_KEY = "75e0cf839f518a6fffed1acbd5377bf8";
const DAYS_OF_THE_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let selectedCityText;
let selectedCity;

const getCitiesUsingGeolocation = async (searchText) => {
  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`
  );
  return res.json();
};

const getCurrentWeatherData = async ({lat, lon, name:city}) => {
  const url = lat && lon?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`:`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
  const response = await fetch(
    url
  );
  return response.json();
};

const getHourlyForecast = async ({name:city}) => {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
  );
  const data = await res.json();
  return data.list.map((forecast) => {
    const {
      main: { temp, temp_max, temp_min },
      dt,
      dt_txt,
      weather: [{ description, icon }],
    } = forecast;
    return { temp, temp_max, temp_min, dt, dt_txt, description, icon };
  });
};

const formatTemperature = (temp) => {
  return `${temp?.toFixed(1)}°`;
};

const createIconURL = (icon) =>
  `http://openweathermap.org/img/wn/${icon}@2x.png`;

const loadCurrentForecast = ({
  name,
  main: { temp, temp_max, temp_min },
  weather: [{ description }],
}) => {
  const currentForecastElement = document.querySelector("#current-forecast");
  currentForecastElement.querySelector(".city").textContent = name;
  currentForecastElement.querySelector(".temp").textContent =
    formatTemperature(temp);
  currentForecastElement.querySelector(".description").textContent =
    description;
  currentForecastElement.querySelector(
    ".min-max-temp"
  ).textContent = `H: ${formatTemperature(temp_max)} L: ${formatTemperature(
    temp_min
  )}`;
};

const loadHourlyForecast = (
  { main: { temp: tempNow }, weather: [{ icon: iconNow }] },
  hourlyForecast
) => {
  const timeFormatter = Intl.DateTimeFormat("en", {
    hour12: true,
    hour: "numeric",
  });
  let dataFor12Hours = hourlyForecast.slice(2, 14);
  const hourlyContainer = document.querySelector(".hourly-container");
  let innerHTMLString = `<article>
  <h3 class="time">Now</h3>
  <img class="icon" src="${createIconURL(iconNow)}" alt="weather-icon">
  <p class="hourly-temp">${formatTemperature(tempNow)}</p>
</article>`;
  for (let { temp, icon, dt_txt } of dataFor12Hours) {
    innerHTMLString += `<article>
        <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createIconURL(icon)}" alt="weather-icon">
        <p class="hourly-temp">${formatTemperature(temp)}</p>
    </article>`;
  }
  hourlyContainer.innerHTML = innerHTMLString;
};

const calculateDayWiseForecast = (hourlyForecast) => {
  let dayWiseForecast = new Map();
  for (let forecast of hourlyForecast) {
    const date = forecast.dt_txt.split(" ")[0];
    const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
    // console.log(dayOfTheWeek);
    if (dayWiseForecast.has(dayOfTheWeek)) {
      let forecastOfTheDay = dayWiseForecast.get(dayOfTheWeek);
      forecastOfTheDay.push(forecast);
      dayWiseForecast.set(dayOfTheWeek, forecastOfTheDay);
    } else {
      dayWiseForecast.set(dayOfTheWeek, [forecast]);
    }
  }
  for (let [key, val] of dayWiseForecast) {
    let temp_min = Math.min(...Array.from(val, (val) => val.temp_min));
    let temp_max = Math.max(...Array.from(val, (val) => val.temp_max));
    dayWiseForecast.set(key, {
      temp_min,
      temp_max,
      icon: val.find((v) => v.icon).icon,
    });
  }

  return dayWiseForecast;
};

const loadFiveDayForecast = (hourlyForecast) => {
  const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);

  const container = document.querySelector(".five-day-forecast-container");
  let dayWiseInfo = ``;
  Array.from(dayWiseForecast).map(
    ([day, { temp_max, temp_min, icon }], index) => {
      dayWiseInfo += `<article class="day-wise-forecast">
                <h3 class="day">${index === 0 ? "Today" : day}</h3>
                <img src="${createIconURL(
                  icon
                )}" class="icon" alt="icon for the forecast">
                <p class="min-temp">${formatTemperature(temp_min)}</p>
                <p class="max-temp">${formatTemperature(temp_max)}</p>
            </article>`;
    }
  );

  container.innerHTML = dayWiseInfo;
};

const loadFeelsLike = ({ main: { feels_like } }) => {
  const container = document.querySelector("#feels-like");
  container.querySelector(".feels-like-temp").textContent =
    formatTemperature(feels_like);
};

const loadHumidity = ({ main: { humidity } }) => {
  const container = document.querySelector("#humidity");
  container.querySelector(".humidity-value").textContent = `${humidity}%`;
};

const loadData = async () =>{
  const currentWeather = await getCurrentWeatherData(selectedCity);
  setBackground(currentWeather)
  loadCurrentForecast(currentWeather);
//   console.log(Math.floor(currentWeather.weather[0].id / 100));
  const hourlyForecast = await getHourlyForecast(currentWeather);
  loadHourlyForecast(currentWeather, hourlyForecast);
  loadFiveDayForecast(hourlyForecast);
  loadFeelsLike(currentWeather);
  loadHumidity(currentWeather);

}

const loadHourlyForecastUsingGeoLocation = () =>{
    navigator.geolocation.getCurrentPosition(({coords}) => {
        const {longitude:lon, latitude:lat} = coords;
        selectedCity = {lat, lon}
        loadData();
    }, error => console.log(error))
}

function debounce(func) {
  let timer;
  return (...args) => {
    // console.log("de");
    clearTimeout(timer); //clear existing timer
    //create a new time til user is typing
    timer = setTimeout(() => {
      func.apply(this, args);
    }, 500);
  };
}

const onSearchChange = async (event) => {
  let { value } = event.target;
  if(!value){
    selectedCity = null;
    selectedCityText = '';
  }
  if(value && selectedCityText !== value){
      const listOfCities = await getCitiesUsingGeolocation(value);
      let options = "";
      for (let { lat, lon, name, state, country } of listOfCities) {
        options += `<option data-city-details='${JSON.stringify({
          lat,
          lon,
          name,
        })}' value="${name}, ${state}, ${country}"></option>`;
      }
      document.querySelector("#cities").innerHTML = options;
    //   console.log("list of cities", listOfCities);
      
  }
};

const setBackground = (currentWeather) => {
    let body = document.querySelector("body")
    const weatherId = 800//currentWeather.weather[0].id  
    // console.log(Math.floor(weatherId / 100));
    if(weatherId === 801){
      body.style.backgroundImage = `url(./images/${8}x.jpg)`
    }
    else{
      body.style.backgroundImage = `url(./images/${Math.floor(weatherId / 100)}.jpg)`
    }

}

const handleCitySelection = (event) => {
  selectedCityText = event.target.value;
  // console.log(selectedCityText);
  let options = document.querySelectorAll("#cities > option");
  if (options?.length) {
    let selectedOption = Array.from(options).find(
      (opt) => opt.value === selectedCityText
    );
    selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
    // console.log(selectedCity);
  }
  loadData()
};

const debounceSearch = debounce((event) => onSearchChange(event));

document.addEventListener("DOMContentLoaded", async () => {
  loadHourlyForecastUsingGeoLocation()
  const searchInput = document.querySelector("#search");
  searchInput.addEventListener("input", debounceSearch);
  searchInput.addEventListener("change", handleCitySelection);
});
