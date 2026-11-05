
"use strict";

const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const searchBtn = document.getElementById("searchBtn");
const statusMessage = document.getElementById("statusMessage");
const dateText = document.getElementById("dateText");
const prayerTimesDiv = document.getElementById("prayerTimes");
const nextPrayerDiv = document.getElementById("nextPrayer");
const suggestionDiv = document.getElementById("suggestion");

const dashboardPage = document.getElementById("dashboardPage");
const plannerPage = document.getElementById("plannerPage");
const dashboardNav = document.getElementById("dashboardNav");
const plannerNav = document.getElementById("plannerNav");
const backDashboardBtn = document.getElementById("backDashboardBtn");

const activityForm = document.getElementById("activityForm");
const activityName = document.getElementById("activityName");
const activityTime = document.getElementById("activityTime");
const activityNotes = document.getElementById("activityNotes");
const saveActivityBtn = document.getElementById("saveActivityBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const plannerMessage = document.getElementById("plannerMessage");
const activityCount = document.getElementById("activityCount");
const activityList = document.getElementById("activityList");

let currentPrayerData = null;
let activities = loadActivities();
let editingActivityId = null;

function showDashboard() {
  dashboardPage.classList.remove("hidden");
  plannerPage.classList.add("hidden");
}

function showPlanner() {
  dashboardPage.classList.add("hidden");
  plannerPage.classList.remove("hidden");
  displayActivities();
}

dashboardNav.addEventListener("click", showDashboard);
plannerNav.addEventListener("click", showPlanner);
backDashboardBtn.addEventListener("click", showDashboard);

function getTodayForAPI() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}

async function getPrayerTimes() {
  const city = cityInput.value.trim();
  const country = countryInput.value.trim();

  if (city === "" || country === "") {
    statusMessage.textContent = "Please enter both city and country.";
    return;
  }

  searchBtn.disabled = true;
  statusMessage.textContent = "Loading prayer times...";
  prayerTimesDiv.textContent = "Please wait...";
  nextPrayerDiv.textContent = "Calculating...";
  suggestionDiv.textContent = "Preparing suggestion...";

  try {
    const date = getTodayForAPI();

    const url =
      `https://api.aladhan.com/v1/timingsByCity/${date}` +
      `?city=${encodeURIComponent(city)}` +
      `&country=${encodeURIComponent(country)}` +
      `&method=17`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("The API request failed.");
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data || !result.data.timings) {
      throw new Error("The API did not return valid prayer times.");
    }

    currentPrayerData = result.data;

    displayPrayerTimes(result.data.timings);
    updateNextPrayer();
    displaySuggestion();

    dateText.textContent =
      `Date: ${result.data.date.readable} | ` +
      `Location: ${city}, ${country}`;

    statusMessage.textContent = "Prayer times loaded successfully.";
  } catch (error) {
    statusMessage.textContent =
      "Unable to retrieve prayer times. Check your internet connection and location.";

    prayerTimesDiv.textContent = "No prayer times available.";
    nextPrayerDiv.textContent = "Next prayer cannot be calculated.";
    suggestionDiv.textContent = "No suggestion available.";

    console.error("Prayer API error:", error);
  } finally {
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener("click", getPrayerTimes);

function displayPrayerTimes(timings) {
  prayerTimesDiv.replaceChildren();

  const prayerNames = [
    ["Fajr", "Fajr"],
    ["Dhuhr", "Dhuhr"],
    ["Asr", "Asr"],
    ["Maghrib", "Maghrib"],
    ["Isha", "Isha"]
  ];

  prayerNames.forEach(function (prayer) {
    const name = prayer[0];
    const label = prayer[1];
    const time = timings[name];

    const card = document.createElement("div");
    card.className = "prayer-card";

    const title = document.createElement("strong");
    title.textContent = label;

    const timeText = document.createElement("span");
    timeText.textContent = time || "Unavailable";

    card.append(title, timeText);
    prayerTimesDiv.appendChild(card);
  });
}

function updateNextPrayer() {
  if (!currentPrayerData) {
    return;
  }

  const timings = currentPrayerData.timings;
  const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextPrayer = null;
  let minutesRemaining = 0;

  for (const name of prayerNames) {
    const time = timings[name];

    if (!time || !/^\d{2}:\d{2}/.test(time)) { //regex check time follow hh:mm format and time format 
      continue;
    }

    const parts = time.match(/^(\d{2}):(\d{2})/);
    const prayerMinutes = Number(parts[1]) * 60 + Number(parts[2]);

    if (prayerMinutes > currentMinutes) {
      nextPrayer = name;
      minutesRemaining = prayerMinutes - currentMinutes;
      break;
    }
  }

  // If all today prayerspassed, Fajr next day
  if (nextPrayer === null) {
    const fajrParts = timings.Fajr.match(/^(\d{2}):(\d{2})/);

    if (!fajrParts) {
      nextPrayerDiv.textContent = "Unable to calculate the next prayer.";
      return;
    }

    const fajrMinutes = Number(fajrParts[1]) * 60 +
      Number(fajrParts[2]);

    nextPrayer = "Fajr";
    minutesRemaining = (24 * 60 - currentMinutes) + fajrMinutes;
  }

  const hours = Math.floor(minutesRemaining / 60);
  const minutes = minutesRemaining % 60;

  nextPrayerDiv.textContent =
    `${nextPrayer} is next. Time remaining: ` +
    `${hours} hour(s) and ${minutes} minute(s).`;
}

function displaySuggestion() {
  if (!currentPrayerData) {
    return;
  }

  const timings = currentPrayerData.timings;
  const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextPrayer = "Fajr";
  let minutesRemaining = 0;
  let foundPrayer = false;

  for (const name of prayerNames) {
    const match = timings[name].match(/^(\d{2}):(\d{2})/);

    if (!match) {
      continue;
    }

    const prayerMinutes = Number(match[1]) * 60 + Number(match[2]);

    if (prayerMinutes > currentMinutes) {
      nextPrayer = name;
      minutesRemaining = prayerMinutes - currentMinutes;
      foundPrayer = true;
      break;
    }
  }

  if (!foundPrayer) {
    const match = timings.Fajr.match(/^(\d{2}):(\d{2})/);
    const fajrMinutes = Number(match[1]) * 60 + Number(match[2]);

    minutesRemaining = (24 * 60 - currentMinutes) + fajrMinutes;
  }

  let message;

  if (minutesRemaining <= 15) {
    message = `Prepare for ${nextPrayer}. Find a suitable place and get ready for prayer.`;
  } else if (minutesRemaining <= 60) {
    message = `Your next prayer is ${nextPrayer}. Use this time to make wudu or review a short surah.`;
  } else {
    message = `There is more time before ${nextPrayer}. Consider reading the Quran, learning about Islam, or planning your day.`;
  }

  suggestionDiv.textContent = message;

  localStorage.setItem("solatTimeSuggestion", message);
}

function loadActivities() {
  try {
    const savedData = localStorage.getItem("solatTimeActivities");

    if (savedData === null) {
      return [];
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData;
  } catch (error) {
    console.error("Unable to load saved activities:", error);
    return [];
  }
}

function saveActivities() {
  localStorage.setItem(
    "solatTimeActivities",
    JSON.stringify(activities)
  );
}

activityForm.addEventListener("submit", function (event) {
  event.preventDefault(); //validate

  const name = activityName.value.trim();
  const time = activityTime.value;
  const notes = activityNotes.value.trim();

  if (name === "" || time === "") {
    plannerMessage.textContent =
      "Please enter an activity name and time.";
    return;
  }

  if (editingActivityId !== null) {
    activities = activities.map(function (activity) {
      if (activity.id === editingActivityId) {
        return {
          ...activity,
          name: name,
          time: time,
          notes: notes
        };
      }

      return activity;
    });

    plannerMessage.textContent = "Activity updated successfully.";
  } else {
    const newActivity = {
      id: Date.now().toString(),
      name: name,
      time: time,
      notes: notes
    };

    activities.push(newActivity);
    plannerMessage.textContent = "Activity added successfully.";
  }

  saveActivities();
  displayActivities();
  resetActivityForm();
});

function displayActivities() {
  activityList.replaceChildren();

  activityCount.textContent =
    `${activities.length} activity/activities saved`;

  if (activities.length === 0) {
    activityList.textContent = "No activities saved yet.";
    return;
  }

  activities.forEach(function (activity) {
    const card = document.createElement("div");
    card.className = "activity-card";

    const title = document.createElement("h3");
    title.textContent = activity.name;

    const time = document.createElement("p");
    time.textContent = `Time: ${activity.time}`;

    const notes = document.createElement("p");
    notes.textContent = activity.notes || "No notes added.";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      editActivity(activity.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener("click", function () {
      deleteActivity(activity.id);
    });

    card.append(title, time, notes, editButton, deleteButton);
    activityList.appendChild(card);
  });
}

function editActivity(id) {
  const activity = activities.find(function (item) {
    return item.id === id;
  });

  if (!activity) {
    plannerMessage.textContent = "Activity not found.";
    return;
  }

  editingActivityId = id;
  activityName.value = activity.name;
  activityTime.value = activity.time;
  activityNotes.value = activity.notes;

  saveActivityBtn.textContent = "Update Activity";
  cancelEditBtn.classList.remove("hidden");
  plannerMessage.textContent = "Edit the details, then select Update Activity.";

  activityForm.scrollIntoView({ behavior: "smooth" });
}

function deleteActivity(id) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this activity?"
  );

  if (!confirmed) {
    return;
  }

  activities = activities.filter(function (activity) {
    return activity.id !== id;
  });

  saveActivities();
  displayActivities();
  plannerMessage.textContent = "Activity deleted successfully.";

  if (editingActivityId === id) {
    resetActivityForm();
  }
}

function resetActivityForm() {
  activityForm.reset();
  editingActivityId = null;
  saveActivityBtn.textContent = "Add Activity";
  cancelEditBtn.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", resetActivityForm);

displayActivities();
