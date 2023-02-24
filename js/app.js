const UTIL = {
  //used in sort function
  convertToCurrentYear(ms) {
    let date1;
    try {
      date1 = new Date(ms);
      date1 = new Date(2023, date1.getMonth(), date1.getDate());
    } catch (error) {
      date1 = new Date(2024, 1, 1);
    }
    return date1.getTime();
  },
  getBirthDateText(ms) {
    try {
      const d1 = new Date(ms);
      const m = d1.toLocaleString("default", { month: "long" });
      const d = d1.toLocaleString("default", { day: "numeric" });
      return `${m} ${d}`;
    } catch (error) {
      return "DOB N/A";
    }
  },
};

const APP = {
  currentPage: "home",
  currentPerson: undefined,
  constants: {
    dataCache: "ULUT0002_DATA",
    pageCache: "ULUT0002_PAGE",
  },
  actions: {
    EDIT_PERSON: "edit_person",
    LIST_GIFTS: "list_gifts",
  },
  dom: {
    home_list: undefined,
  },
  data: {
    cacheRef: undefined,
    sst: [],
    //Single source of data
  },
  init() {
    //page has loaded
    //read dom elements
    APP.dom.home_list = document.getElementById("people-list");

    APP.addListeners();

    //open cache, and load data into Single Source of Truth
    caches.open(APP.constants.dataCache).then((cache) => {
      if (cache) {
        APP.data.cacheRef = cache;
        cache.keys().then((keys) => {
          const resultPromiseArr = keys.map((key) => {
            return cache.match(key).then((matchResult) => {
              return matchResult.json();
            });
          });
          Promise.all(resultPromiseArr).then((people) => {
            people.forEach((person) => {
              APP.data.sst.push(person);
            });
            APP.navigate("");
          });
        });
      }
    });
  },
  addListeners() {
    //add DOM listeners
    document.addEventListener("click", APP.handleClick);
  },
  home: {
    rebuildList() {
      if (!APP.dom.home_list) return;
      APP.dom.home_list.innerHTML = "";
      if (APP.data.sst && Array.isArray(APP.data.sst)) {
        console.log("gifter list is not empty");
        // console.log(APP.data.sst);

        APP.data.sst.sort((p1, p2) => {
          return (
            UTIL.convertToCurrentYear(p1.dob) -
            UTIL.convertToCurrentYear(p2.dob)
          );
        });
        let html = `<ul class="person--container">`;
        html += APP.data.sst
          .map((person) => {
            // console.log(pe);
            return `<li data-giftr="data_source" data-id="${
              person.id
            }" data-source="person" class="person--list--item" >
                <h2 class="person--name">${person.name}</h2>
                <h3 class="person--dob">${UTIL.getBirthDateText(
                  person.dob
                )}</h3>
                <div data-giftr_action="edit_person" class="button--container edit--button--container">
                  <span class="material-symbols-outlined btn  edit-btn">edit</span>
                </div>
                <div data-giftr_action="list_gifts" class="button--container gift--button--container">
                <span class="material-symbols-outlined btn gift-btn">redeem</span>
                </div>
                
              </li>`;
          })
          .join(" ");
        html += "</ul>";
        APP.dom.home_list.innerHTML = html;
        // console.log("html", html);
      } else {
        console.log("gifter list is empty");
      }
    },
  },

  navigate(page = "home") {
    //navigate to a new page
    page = page.toLowerCase();
    switch (page) {
      case "home":
        APP.home.rebuildList();
        break;
      case "add_edit_person":
        break;
      case "gift_ideas":
        break;
      case "add_edit_gift":
        break;

      default: //back to home
        APP.navigate("home");
        break;
    }
  },
  handleClick(ev) {
    //ev.preventDefault();
    // const actionable = ev.target.closest(`[data-actionable="giftr"]`);
    const actionable = ev.target.closest(`[data-giftr_action]`);
    const dataSource = ev.target.closest(`[data-giftr="data_source"]`);
    if (!actionable || !dataSource) return;
    // console.log(actionable);
    // console.log(dataSet);
    let actionToTake = actionable.dataset.giftr_action;
    if (!actionToTake) return;
    actionToTake = actionToTake.toLowerCase();
    // console.log("action to take", actionToTake);
    switch (actionToTake) {
      case "edit_person":
        APP.assignCurrentPerson(dataSource.dataset.id);
        break;
      case "list_gifts":
        APP.assignCurrentPerson(dataSource.dataset.id);
        break;

      default:
        break;
    }
    // data-actionable="giftr"
  },
  assignCurrentPerson(selectedId) {
    if (!selectedId) return;
    const person = APP.data.sst.find((person) => person.id === selectedId);
    if (!person) {
      APP.currentPerson = undefined;
      return;
    }
    APP.currentPerson = { ...person };
    console.log(APP.currentPerson);
  },
};

document.addEventListener("DOMContentLoaded", APP.init);

//################### TEST FUNCTIONS ################

const test_UserArray = [];
function testCreateDummyUsers() {
  test_UserArray.push(test_createDummyUser("Jane Smith", "1969-03-03"));
  test_UserArray.push(test_createDummyUser("Allison Cooper", "1976-04-05"));
  test_UserArray.push(test_createDummyUser("Robert Duff", "1989-03-03"));
  test_UserArray.push(test_createDummyUser("Jimmy Atkinson", "1977-02-09"));
}
function test_createDummyUser(name = "John Doe", dob = "1990-01-01") {
  let person = {
    id: crypto.randomUUID(),
    name: name,
    dob: Date.parse(dob),
    gifts: [],
  };
  const numOfGifts = randomNum(2, 5);
  for (let index = 0; index < numOfGifts; index++) {
    person.gifts.push(test_createRandomGift());
  }

  return person;
}

function test_createRandomGift() {
  const giftId = crypto.randomUUID();
  return {
    gift_id: giftId,
    text: `Gift #${giftId.substring(0, 2).toUpperCase()}`,
    store: `Ground ${giftId.substring(4, 7).toUpperCase()}`,
    url: `https://www.ground${giftId.substring(4, 7)}.com`,
  };
}

function randomNum(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function saveUsersIntoCache() {
  if (caches.has(APP.data.constants.user_cache)) {
  }
}

// console.log("User: ", test_createDummyUser());

function saveDummyDataIntoCache() {
  test_UserArray.forEach((user) => {
    caches.open(APP.constants.dataCache).then((cache) => {
      if (cache) {
        cache.put(`${user.id}.json`, new Response(JSON.stringify(user)));
      }
    });
  });
}

//console.log(test_UserArray);

//commented code
// Promise.all(keys).then((keys) => {
//   keys.forEach((personKey) => {
//     cache
//       .match(personKey)
//       .then((cacheResult) => {
//         if (cacheResult) {
//           return cacheResult.json();
//         }
//       })
//       .then((result) => {
//         if (result) {
//           APP.data.sst.push(result);
//         }
//       });
//   });
//   //right here
//   console.log(APP.data.sst);
// });
