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
  getFilename(id) {
    return `${id}.giftr`;
  },
};

const DOM_UTIL = {
  showHideDomElement(element, hide) {
    if (!element) return;
    if (!element.classList) return;
    if (hide) element.classList.add("visually-hidden");
    else element.classList.remove("visually-hidden");
  },
};

const APP = {
  currentPage: "home",
  currentPerson: undefined,
  currentGift: undefined,
  CACHE: {
    dataCache: "ULUT0002_DATA",
    pageCache: "ULUT0002_PAGE",
  },

  //dom components for each object
  dom: {
    body: undefined,
    home_list: undefined,

    add_edit_gift: {
      main: undefined,
      title: undefined,
      name: undefined,
      store: undefined,
      url: undefined,
    },
  },
  //single source of truth
  data: {
    cacheRef: undefined,
    sst: [],
  },
  init() {
    //page has loaded
    //read dom elements
    APP.readDOMElements();
    APP.addListeners();

    //open cache, and load data into Single Source of Truth
    caches.open(APP.CACHE.dataCache).then((cache) => {
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
    //each page stores their own dom elements for easier manipulation
    APP.dom.body = document.querySelector("body");
    APP.pages.home.readDom();
    APP.pages.add_edit_person.readDom();
    APP.pages.gift_ideas.readDom();
    APP.pages.add_edit_gift.readDom();
  },
  addListeners() {
    document.addEventListener("click", APP.handleClick);
  },
  pages: {
    //helper functions to figure out which page we are on
    isCurrentPage: {
      homePage() {
        return APP.currentPage === APP.pages.home.id;
      },
      editPersonPage() {
        return APP.currentPage === APP.pages.add_edit_person.id;
      },
      giftListPage() {
        return APP.currentPage === APP.pages.gift_ideas.id;
      },
      giftEditPage() {
        return APP.currentPage === APP.pages.add_edit_gift.id;
      },
    },

    //each unique page has their own id and functions
    home: {
      id: "home",
      dom: {
        main: undefined,
        container: undefined,
      },
      readDom() {
        const main = document.getElementById("home");
        if (main) {
          APP.pages.home.dom.main = main;
          APP.pages.home.dom.container = main.querySelector("#home__container");
        }
      },
      rebuildList() {
        const container = APP.pages.home.dom.container;
        let html = "";
        if (!container) return;
        container.innerHTML = "";
        if (
          APP.data.sst &&
          Array.isArray(APP.data.sst) &&
          APP.data.sst.length > 0
        ) {
          APP.data.sst.sort((p1, p2) => {
            return (
              UTIL.convertToCurrentYear(p1.dob) -
              UTIL.convertToCurrentYear(p2.dob)
            );
          });
          html = `<ul class="person--container">`;
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

          // console.log("html", html);
        } else {
          html = `<h3 class="empty--list-warning">Your list is empty. Click + button to add new entries</h3>`;
        }
        container.innerHTML = html;
      },
    },
    add_edit_person: {
      id: "add_edit_person",
      dom: {
        main: undefined,
        title: undefined,
        name: undefined,
        dob: undefined,
        deleteBtn: undefined,
        downloadBtn: undefined,
      },
      readDom() {
        const main = document.getElementById("add_edit_person");
        const dom = APP.pages.add_edit_person.dom;
        if (main) {
          dom.title = main.querySelector(".title");
          dom.name = main.querySelector("#name");
          dom.dob = main.querySelector("#dob");
          dom.deleteBtn = main.querySelector(".delete-btn");
          dom.downloadBtn = main.querySelector(".download-btn");
          dom.main = main;
        }
      },
      getName() {
        const dom = APP.pages.add_edit_person.dom;
        return dom.name.value.trim();
      },
      getDOB() {
        const dom = APP.pages.add_edit_person.dom;
        return dom.dob.value.trim();
      },
      buildPage() {
        const dom = APP.pages.add_edit_person.dom;
        dom.title.innerHTML = "Add New Person";
        if (APP.currentPerson && APP.currentPerson.name) {
          dom.title.innerHTML = `Edit ${APP.currentPerson.name}`;
        }
        dom.name.value = APP.currentPerson.name;
        dom.main.setAttribute("data-id", APP.currentPerson.id);
        dom.dob.value = "";
        if (typeof APP.currentPerson.dob === "number")
          dom.dob.value = UTIL.convertDOBtoDateInput(APP.currentPerson.dob);

        DOM_UTIL.showHideDomElement(dom.deleteBtn, APP.currentPerson.newEntry);
        DOM_UTIL.showHideDomElement(
          dom.downloadBtn,
          APP.currentPerson.newEntry
        );
      },
      editPerson(params) {
        const { dataSource } = params;
        APP.assignCurrentPerson(dataSource.dataset.id);
        if (!APP.currentPerson) {
          //display error
          return;
        }
        APP.navigate("add_edit_person");
      },
      newPerson(params) {
        APP.assignCurrentPerson(null);
        APP.navigate("add_edit_person");
      },
      saveNewPerson() {
        const name = APP.pages.add_edit_person.getName();
        const dobText = APP.pages.add_edit_person.getDOB();

        let dob = undefined;
        try {
          dob = new Date(Date.parse(dobText));
          //source: https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off
          dob = dob.getTime() + Math.abs(dob.getTimezoneOffset() * 60000);
        } catch (error) {}

        if (!name || !dob) {
          //return / show error
          console.log("name and dob are mandatory");
          return;
        }

        APP.currentPerson.name = name;
        APP.currentPerson.dob = dob;

        delete APP.currentPerson["newEntry"];

        APP.data.cacheRef
          .put(
            UTIL.getFilename(APP.currentPerson.id),
            new Response(JSON.stringify(APP.currentPerson))
          )
          .then((_) => {
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
      },
      downloadPerson(params) {
        console.log("Not implemented");
      },
      deletePerson(params) {
        const { dataSource } = params;
        if (!dataSource || !dataSource.dataset.id) {
          //an error?
          return;
        }
        const id = dataSource.dataset.id;

        APP.data.cacheRef
          .delete(UTIL.getFilename(APP.currentPerson.id))
          .then((_) => {
            console.log("deleted from cache");

            idx = APP.data.sst.findIndex((person) => person.id === id);
            if (idx >= 0) {
              APP.data.sst.splice(idx, 1);
            }
            APP.navigate("home");
          });

        // console.log("delete id", dataSource.dataset.id);
      },
    },
    gift_ideas: {
      id: "gift_ideas",
      dom: {
        main: undefined,
        container: undefined,
        title: undefined,
      },
      readDom() {
        const main = document.getElementById("gift_ideas");
        if (main) {
          APP.pages.gift_ideas.dom.main = main;
          APP.pages.gift_ideas.dom.container = main.querySelector(".container");
          APP.pages.gift_ideas.dom.title = main.querySelector("h2");
        }
      },
      buildPage() {
        const dom = APP.pages.gift_ideas.dom;
        const container = dom.container;
        if (!container) {
          return;
        }
        let html = "";
        dom.title.innerHTML = `Gift ideas for ${APP.currentPerson.name}`;
        if (
          APP.currentPerson.gifts &&
          Array.isArray(APP.currentPerson.gifts) &&
          APP.currentPerson.gifts.length > 0
        ) {
          html += `<ul class="gift--container">`;
          html += APP.currentPerson.gifts
            .map((gift) => {
              return `<li data-giftr="data_source" data-id="${gift.id}" data-source="gift" class="gift--list--item" >
                  <h2 class="gift--name">${gift.name}</h2>
                  <h3 class="gift--store">${gift.store}</h3>
                  <h3 class="gift--url">${gift.url}</h3>
                  <div data-giftr_action="edit_gift" class="button--container edit--button--container">
                    <span class="material-symbols-outlined btn  edit-btn">edit</span>
                  </div>
                  <div data-giftr_action="delete_gift" class="button--container delete--button--container">
                  <span class="material-symbols-outlined btn gift-btn">delete</span>
                  </div>
                </li>`;
            })
            .join(" ");

          html += "</ul>";
        } else {
          // there are no gifts
          html = "Gift list is empty";
        }
        container.innerHTML = html;
      },
      listGifts(param) {
        const { dataSource } = param;
        APP.assignCurrentPerson(dataSource.dataset.id);
        APP.navigate("gift_ideas");
      },
    },
    add_edit_gift: {
      id: "add_edit_gift",
      dom: {
        main: undefined,
        title: undefined,
        name: undefined,
        store: undefined,
        url: undefined,
        deleteBtn: undefined,
      },
      getUserValues() {
        const dom = APP.pages.add_edit_gift.dom;
        return {
          name: dom.name.value.trim(),
          store: dom.store.value.trim(),
          url: dom.url.value.trim(),
        };
      },
      readDom() {
        const dom = APP.pages.add_edit_gift.dom;
        const main = document.getElementById("add_edit_gift");
        if (main) {
          dom.main = main;
          dom.name = main.querySelector("#gift_name");
          dom.store = main.querySelector("#gift_store");
          dom.url = main.querySelector("#gift_url");
          dom.title = main.querySelector("h2");
          dom.deleteBtn = main.querySelector(".delete-btn");
        }
      },
      buildPage() {
        const dom = APP.pages.add_edit_gift.dom;
        dom.title.innerHTML = `Add Gift - ${APP.currentPerson.name}`;
        dom.name.value = APP.currentGift.name;
        dom.store.value = APP.currentGift.store;
        dom.url.value = APP.currentGift.url;
        DOM_UTIL.showHideDomElement(dom.deleteBtn, APP.currentGift.newEntry);
      },
      newGift() {
        APP.assignCurrentGift(null, null);
        APP.navigate("add_edit_gift");
      },
      cancelNewGift() {
        APP.currentGift = null;
        APP.navigate("gift_ideas");
      },
      saveNewGift(params) {
        const { dataSource } = params;
        const userValues = APP.pages.add_edit_gift.getUserValues();

        if (!userValues.name) {
          // display error
          return;
        }

        if (!APP.currentPerson.id) {
          // display error
          return;
        }

        const giftToAdd = {
          id: APP.currentGift.id,
          name: userValues.name,
          store: userValues.store,
          url: userValues.url,
        };

        let addGiftFilename = UTIL.getFilename(APP.currentPerson.id);

        APP.data.cacheRef
          .match(addGiftFilename)
          .then((matchResult) => {
            if (matchResult) {
              return matchResult.json();
            }
          })
          .then((result) => {
            if (result) {
              result.gifts.push(giftToAdd);
              return APP.data.cacheRef.put(
                addGiftFilename,
                new Response(JSON.stringify(result))
              );
            }
            return;
          })
          .then((result) => {
            if (result) {
              // add the gift to the array
              const idx = APP.data.sst.findIndex(
                (person) => person.id === APP.currentPerson.id
              );
              if (idx >= 0) {
                APP.data.sst[idx].gifts.push(giftToAdd);
              }
              APP.currentGift = null;
              APP.navigate("gift_ideas");
            }
          });
      },
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
        APP.pages.add_edit_gift.buildPage();
        APP.dom.body.classList = page;
        APP.currentPage = page;
        break;

      default: //back to home
        APP.navigate("home");
        break;
    }
  },
  handleClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const actionable = ev.target.closest(`[data-giftr_action]`);
    const dataSource = ev.target.closest(`[data-giftr="data_source"]`);
    if (!actionable) return;

    let requestedAction = actionable.dataset.giftr_action;
    if (!requestedAction) return;
    requestedAction = requestedAction.toLowerCase();
    // console.log(
    //   "Requested Action: ",
    //   requestedAction,
    //   "   Page:",
    //   APP.currentPage
    // );

    const params = {
      dataSource: dataSource,
    };

    switch (requestedAction) {
      case "edit_person":
        APP.pages.add_edit_person.editPerson(params);
        break;
      case "add_record":
        if (APP.pages.isCurrentPage.homePage())
          APP.pages.add_edit_person.newPerson();
        else if (APP.pages.isCurrentPage.giftListPage())
          APP.pages.add_edit_gift.newGift();
        break;
      case "list_gifts":
        APP.pages.gift_ideas.listGifts(params);
        break;
      case "cancel_new_gift":
        APP.pages.add_edit_gift.cancelNewGift();
        break;
      case "save_new_gift":
        APP.pages.add_edit_gift.saveNewGift(params);
        break;

      case "save_person":
        APP.pages.add_edit_person.saveNewPerson();
        break;

      case "download_person":
        APP.pages.add_edit_person.downloadPerson(params);
        break;

      case "delete_person":
        APP.pages.add_edit_person.deletePerson(params);
        break;

      case "cancel_add_edit_person":
        APP.navigate("main");
        break;

      case "go_back":
        if (APP.pages.isCurrentPage.editPersonPage()) {
          APP.navigate(APP.pages.home.id);
        } else if (APP.pages.isCurrentPage.giftListPage()) {
          APP.navigate(APP.pages.home.id);
        } else if (APP.pages.isCurrentPage.giftEditPage()) {
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
      // const dummyDate = new Date(Date.parse("2000-01-01"));
      APP.currentPerson = {
        id: crypto.randomUUID(),
        name: "",
        dob: "", //string on purpose
        gifts: [],
        newEntry: true,
      };
      return;
    }
    const person = APP.data.sst.find((person) => person.id === selectedId);
    if (!person) {
      APP.currentPerson = undefined;
      return;
    }
    APP.currentPerson = { ...person, newEntry: false };
  },
  assignCurrentGift(selectedGiftID) {
    if (!selectedGiftID) {
      APP.currentGift = {
        id: crypto.randomUUID(),
        name: "",
        store: "",
        url: "",
        newEntry: true,
      };
      return;
    }

    // or find the selected gift on the current person
    const idx = APP.currentPerson.gifts.findIndex(
      (gift) => gift.id === selectedGiftID
    );
    if (idx < 0) {
      //display error
      return;
    }
    APP.currentGift = { ...APP.currentPerson.gifts[idx], newEntry: false };
    return;
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
    id: giftId,
    name: `Gift #${giftId.substring(0, 2).toUpperCase()}`,
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
    caches.open(APP.CACHE.dataCache).then((cache) => {
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
