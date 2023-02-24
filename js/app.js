const log = console.log;

//Utility functions for the APP object
const UTIL = {
  //used in sort function
  convertToCurrentYear(ms) {
    let date1;
    try {
      date1 = new Date(ms);
      date1 = new Date(2023, date1.getMonth() + 1, date1.getDate());
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
  convertDOBtoDateInput(ms) {
    //source: https://stackoverflow.com/questions/12346381/set-date-in-input-type-date
    let date;
    try {
      date = new Date(ms);
      log(`date`, date.toDateString());
    } catch (error) {
      log("error");
      return "";
    }
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const today = date.getFullYear() + "-" + month + "-" + day;
    log("today:", today);
    return today;
  },
};

const APP = {
  currentPage: "home",
  currentPerson: undefined,
  constants: {
    dataCache: "ULUT0002_DATA",
    pageCache: "ULUT0002_PAGE",
  },

  //dom components for each object
  dom: {
    body: undefined,
    home_list: undefined,
    add_edit_person: {
      container: undefined,
      title: undefined,
      name: undefined,
      dob: undefined,
    },
    gift_ideas: {
      main: undefined,
      container: undefined,
      title: undefined,
    },
  },
  data: {
    cacheRef: undefined,
    sst: [],
    //Single source of data
  },
  init() {
    //page has loaded
    //read dom elements
    APP.readDOMElements();
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
  readDOMElements() {
    APP.dom.home_list = document.getElementById("people-list");
    APP.dom.body = document.querySelector("body");
    APP.dom.add_edit_person.container =
      document.getElementById("add_edit_person");
    APP.dom.gift_ideas.main = document.getElementById("gift_ideas");

    //elements on the add_edit_person page
    if (APP.dom.add_edit_person.container) {
      const el = APP.dom.add_edit_person.container; //less text
      APP.dom.add_edit_person.title = el.querySelector(".title");
      APP.dom.add_edit_person.name = el.querySelector("#name");
      APP.dom.add_edit_person.dob = el.querySelector("#dob");
    }

    if (APP.dom.gift_ideas.main) {
      const el = APP.dom.gift_ideas.main;
      APP.dom.gift_ideas.container = el.querySelector(".container");
      APP.dom.gift_ideas.title = el.querySelector("h2");
    }
  },
  addListeners() {
    document.addEventListener("click", APP.handleClick);
  },
  pages: {
    //helper functions to figure out which page we are on
    isHomePage() {
      return APP.currentPage === APP.pages.home.id;
    },
    isEditPersonPage() {
      return APP.currentPage === APP.pages.add_edit_person.id;
    },
    isGiftListPage() {
      return APP.currentPage === APP.pages.gift_ideas.id;
    },
    isGiftEditPage() {
      return APP.currentPage === APP.pages.add_edit_gift.id;
    },

    //each unique page has their own id and functions
    home: {
      id: "home",
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
          console.log("giftr list is empty");
        }
      },
    },
    add_edit_person: {
      id: "add_edit_person",
      buildPage() {
        if (!APP.dom.add_edit_person.container) {
          // display error message
          return;
        }

        const el = APP.dom.add_edit_person;

        if (APP.currentPerson && APP.currentPerson.name) {
          el.title.innerHTML = `Edit ${APP.currentPerson.name}`;
        } else {
          el.title.innerHTML = "Add New Person";
        }
        el.name.value = APP.currentPerson.name;
        el.container.setAttribute("data-id", APP.currentPerson.id);

        el.dob.value = UTIL.convertDOBtoDateInput(APP.currentPerson.dob);

        //
      },
    },
    gift_ideas: {
      id: "gift_ideas",
      buildPage() {
        const container = APP.dom.gift_ideas.container;
        if (!container) {
          return;
        }
        let html = "";
        APP.dom.gift_ideas.title.innerHTML = `Gift ideas for ${APP.currentPerson.name}`;
        if (
          APP.currentPerson.gifts &&
          Array.isArray(APP.currentPerson.gifts) &&
          APP.currentPerson.gifts.length > 0
        ) {
          html = "List gifts here";
        } else {
          // there are no gifts
          html = "Gift list is empty";
        }
        container.innerHTML = html;
      },
    },
    add_edit_gift: {
      id: "add_edit_gift",
      buildPage() {},
    },
  },

  navigate(page = "home") {
    //navigate to a new page
    page = page.toLowerCase();
    switch (page) {
      case "home":
        APP.pages.home.rebuildList();
        APP.dom.body.classList = page;
        APP.currentPage = page; //add_edit_person
        break;
      case "add_edit_person":
        APP.pages.add_edit_person.buildPage();
        APP.dom.body.classList = page;
        APP.currentPage = page; //add_edit_person
        break;
      case "gift_ideas":
        APP.pages.gift_ideas.buildPage();
        APP.dom.body.classList = page;
        APP.currentPage = page;
        break;
      case "add_edit_gift":
        APP.dom.body.classList = page;
        APP.currentPage = page;
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
    if (!actionable) return;
    ev.stopPropagation();

    // console.log(actionable);
    // console.log(dataSet);
    let actionToTake = actionable.dataset.giftr_action;
    if (!actionToTake) return;
    actionToTake = actionToTake.toLowerCase();
    console.log("action to take", actionToTake);
    switch (actionToTake) {
      case "edit_person":
        APP.assignCurrentPerson(dataSource.dataset.id);
        if (!APP.currentPerson) {
          //display error
          return;
        }
        APP.navigate("add_edit_person");
        break;
      case "add_record":
        console.log("current page: ", APP.currentPage);
        // console.log("pa")
        if (APP.pages.isHomePage()) {
          APP.assignCurrentPerson(null);
          APP.navigate("add_edit_person");
        } else if (APP.pages.isGiftListPage()) {
          APP.navigate("add_edit_gift");
        }
        break;
      case "list_gifts":
        APP.assignCurrentPerson(dataSource.dataset.id);
        APP.navigate("gift_ideas");
        break;

      case "save_person":
        // Where: "Add/Edit person page"
        const name = APP.dom.add_edit_person.name.value.trim();
        const dobText = APP.dom.add_edit_person.dob.value.trim();

        let dob;
        try {
          dob = new Date(Date.parse(dobText));
        } catch (error) {}

        if (!name || !dob) {
          //return error
        }

        APP.currentPerson.name = name;

        //source: https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off
        APP.currentPerson.dob =
          dob.getTime() + Math.abs(dob.getTimezoneOffset() * 60000);

        APP.data.cacheRef
          .put(
            `${APP.currentPerson.id}.json`,
            new Response(JSON.stringify(APP.currentPerson))
          )
          .then((result) => {
            const idx = APP.data.sst.findIndex(
              (person) => person.id === APP.currentPerson.id
            );
            if (idx >= 0) {
              APP.data.sst[idx] = APP.currentPerson;
            } else {
              APP.data.sst.push(APP.currentPerson);
            }

            APP.navigate("main");
          });

        break;

      case "download_person":
        // Where: "Add/Edit person page"

        break;

      case "delete_person":
        // Where: "Add/Edit person page"
        if (!dataSource || !dataSource.dataset.id) {
          //an error?
          return;
        }
        const id = dataSource.dataset.id;

        APP.data.cacheRef.delete(`${id}.json`).then((_) => {
          console.log("deleted from cache");

          idx = APP.data.sst.findIndex((person) => person.id === id);
          if (idx >= 0) {
            APP.data.sst.splice(idx, 1);
          }
          APP.navigate("home");
        });

        // console.log("delete id", dataSource.dataset.id);

        break;

      case "cancel_add_edit_person":
        APP.navigate("main");
        break;

      case "go_back":
        if (APP.pages.isEditPersonPage()) {
          APP.navigate("main");
        } else if (APP.pages.isGiftListPage()) {
          APP.navigate("main");
        } else if (APP.pages.isGiftEditPage()) {
          APP.navigate(APP.pages.gift_ideas.id);
        }
        break;

      default:
        break;
    }
    // data-actionable="giftr"
  },
  assignCurrentPerson(selectedId) {
    if (!selectedId) {
      APP.currentPerson = {
        id: crypto.randomUUID(),
        name: "",
        dob: Date.now(),
        gifts: [],
      };
      return;
    }
    const person = APP.data.sst.find((person) => person.id === selectedId);
    if (!person) {
      APP.currentPerson = undefined;
      return;
    }
    APP.currentPerson = { ...person };
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
