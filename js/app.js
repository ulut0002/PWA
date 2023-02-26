import MessageBox from "./message.js";

//Utility functions for the APP object
const UTIL = {
  // converts each given year to 2023/mm/dd for sorting on main page
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
  //converts birthday to "<month_text> <dd>" format: January 19
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
  //converts date to mmmm-yy-dd format for the input field
  convertDOBtoDateInput(ms) {
    //source: https://stackoverflow.com/questions/12346381/set-date-in-input-type-date
    let date;
    try {
      date = new Date(ms);
    } catch (error) {
      return "";
    }
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const today = date.getFullYear() + "-" + month + "-" + day;
    return today;
  },
  // returns the cache file request url
  getFilename(id) {
    return `${id}.giftr`;
  },
  // used in gift-list page. If the user enters "walmart.ca", this is turned into real url
  // so that <a> tag can be used properly.
  parseTextToURL(value) {
    if (!value) return "";
    if (typeof value !== "string") return "";
    let lo_case = value.toLowerCase();
    if (!lo_case.startsWith("http")) {
      lo_case = "https://" + lo_case;
    }
    try {
      if (!lo_case.includes(".")) throw Error("");
      const url = new URL(lo_case);
      return { value: url.href, validURL: true };
    } catch (error) {
      return { value: value, validURL: false };
    }
  },
};

// Message-box component can communicate with the main page only through event dispatcher.
// window["function_name"].("param") method did not work
// check message.js for the CustomEvent dispatcher

document.addEventListener("closeMessage", (ev) => {
  ev.stopPropagation();
  DOM_UTIL.closeMessage(ev.detail.msgId);
});

// Utility functions for the DOM object
const DOM_UTIL = {
  //This is used to show/hide "delete" button on "new entry" and "edit entry" pages
  // "new entry" page does not show the delete button
  showHideDomElement(element, hide) {
    if (!element) return;
    if (!element.classList) return;
    if (hide) element.classList.add("visually-hidden");
    else element.classList.remove("visually-hidden");
  },
  //When user clicks "ok" button on an error message, it fires a custom event with the msgID
  // This event is caught here (see "closeMessage" event listener), and the message is removed
  closeMessage(id) {
    const msg = document.querySelector(`div[msgId='${id}']`);
    if (msg) msg.remove();
  },
  // A generic error message for unlikely, buggy errors
  displayContactDeveloperError(errorContainerDiv) {
    DOM_UTIL.displayError(
      errorContainerDiv,
      APP.MESSAGE.TITLE.UNEXPECTED,
      APP.MESSAGE.BODY.DEVELOPER,
      APP.MESSAGE.TYPE.ERROR
    );
  },
  // displays an error message on the given container div.
  // Note that each page has their own container-div element.
  displayError(errorContainerDiv, title, message, type) {
    if (!errorContainerDiv) {
      return;
    }
    const newErrorMsg = DOM_UTIL.createMessageElement(title, message, type);
    errorContainerDiv.innerHTML = "";
    errorContainerDiv.append(newErrorMsg);
  },

  createMessageElement(title, message, type) {
    //each message box has their own unique id. The id is used in closeMessage function.
    const msgID = crypto.randomUUID();
    const wrapper = document.createElement("div");
    wrapper.setAttribute("msgId", msgID);

    const msg = document.createElement("message-box");
    msg.setAttribute("action", "closeMessage");
    msg.setAttribute("type", type);
    msg.setAttribute("msgId", msgID); // will be used for the close button

    msg.classList.add("message--box");

    if (title) {
      const el = document.createElement("h3");
      el.setAttribute("slot", "title");
      el.classList.add("list--item--text_lg2");
      el.textContent = title;
      msg.append(el);
    }

    const p = document.createElement("p");
    p.setAttribute("slot", "message");
    p.textContent = message;
    msg.append(p);

    const btn = document.createElement("span");
    btn.setAttribute("slot", "done");
    btn.textContent = "OK";
    msg.append(btn);

    wrapper.append(msg);

    return wrapper;
  },
};

const APP = {
  currentPage: "home",
  currentPerson: undefined,
  currentGift: undefined,
  MESSAGE: {
    TITLE: {
      UNEXPECTED: "Unexpected error!",
      DEVELOPER: "Attention to Developer",
      MANDATORY_FIELDS_MISSING: "Mandatory field(s) missing",
      CACHE_FAILURE: "Cache failure",
      RECORD_NOT_FOUND: "Record not found",
    },
    BODY: {
      DEVELOPER: "Contact developer for this error.",
      NAME_DOB_MISSING: "Enter a valid name and date of birth.",
      GIFT_NAME_MISSING: "Enter a valid name for your gift",
      NEW_PERSON_FAIL:
        "An error happened while creating a new person. Try again later.",
      DELETE_PERSON_FAIL:
        "An error happened while deleting the person. Try again later.",
      DELETE_GIFT_FAIL:
        "An error happened while deleting the gift. Try again later.",
      ENTRY_NOT_EXISTS:
        "The record you want to retrieve no longer exists. Refresh the main page again.",
    },
    TYPE: {
      ERROR: "error",
      WARNING: "warning",
      INFO: "info",
      SUCCESS: "success",
    },
  },
  CACHE: {
    dataCache: "ULUT0002_DATA",
  },

  // only "body" element is part of APP.dom.
  // other pages has their own "dom" object
  dom: {
    body: undefined,
  },

  // single source of truth array
  // sst array contains the list of people.
  // every cache operation on cacheRef is reflected on sst array upon successful result
  data: {
    cacheRef: undefined,
    sst: [],
  },

  init() {
    //page has loaded. Read dom elements on each page and add action listener
    APP.registerWorker();
    APP.readDOMElements();
    APP.addListeners();

    //open cache, and load data into Single Source of Truth
    caches
      .open(APP.CACHE.dataCache)
      .then((cache) => {
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
      })
      .catch((err) => {
        // TODO: Add error box here
      });
  },
  registerWorker() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("./sw.js");
    }
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
    // system listens to each click on the page.
    // each clicks checks the closest attribute: "data-giftr_action"
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

    // 'pages' object has:
    // 1. pages.home
    // 2. pages.add_edit_person
    // 3. pages.gift_ideas
    // 4. pages.add_edit_gift objects,
    // each unique page has their own id, dom objects and relevant functions
    home: {
      id: "home",
      dom: {
        main: undefined,
        container: undefined,
        errorContainer: undefined,
      },
      readDom() {
        const main = document.getElementById("home");
        if (main) {
          APP.pages.home.dom.main = main;
          APP.pages.home.dom.container = main.querySelector("#home__container");
          APP.pages.home.dom.errorContainer =
            main.querySelector("#error-container");
        }
      },
      //When the page is reloaded, any existing error is removed from the page
      removeError() {
        APP.pages.home.dom.errorContainer.innerHTML = "";
      },
      // builds the people-list
      rebuildList() {
        APP.pages.home.removeError();
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
          html = `<ul class="list--container person--container">`;
          html += APP.data.sst
            .map((person) => {
              let giftCount = Array.isArray(person.gifts)
                ? person.gifts.length
                : 0;

              let giftCountText = "No gifts yet";
              if (giftCount === 1) {
                giftCountText = "1 gift only";
              } else {
                giftCountText = `${giftCount} gifts`;
              }

              return `<li data-giftr="data_source" data-id="${
                person.id
              }" data-source="person" class="list--container--item person--list--item" >
                  <h2 class="list--item--text_xl person--name">${
                    person.name
                  }</h2>
                  <h3 class=" list--item--text_small person--dob">${UTIL.getBirthDateText(
                    person.dob
                  )} &nbsp;|&nbsp;  ${giftCountText}</h3>
                  <div data-giftr_action="edit_person" class="button--container edit--button--container ">
                    <span class="material-symbols-outlined btn home_page_btn">edit</span>
                  </div>
                  <div data-giftr_action="list_gifts" class="button--container gift--button--container">
                  <span class="material-symbols-outlined btn home_page_btn">redeem</span>
                  </div>
                </li>`;
            })
            .join(" ");
          html += "</ul>";
        } else {
          html = `<h3 class="empty--list-warning">Why is gift list empty? Click + button to add new people!</h3>`;
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
        errorContainer: undefined,
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
          dom.errorContainer = main.querySelector("#error-container");
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
      removeError() {
        APP.pages.add_edit_person.dom.errorContainer.innerHTML = "";
      },
      buildPage() {
        APP.pages.add_edit_person.removeError();
        const dom = APP.pages.add_edit_person.dom;
        dom.title.innerHTML = "Add New Person";
        if (APP.currentPerson && APP.currentPerson.name) {
          dom.title.innerHTML = `Edit "${APP.currentPerson.name}"`;
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
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.UNEXPECTED,
            APP.MESSAGE.BODY.DEVELOPER,
            APP.MESSAGE.TYPE.ERROR
          );
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
        const dom = APP.pages.add_edit_person.dom;

        let dob = undefined;
        try {
          dob = new Date(Date.parse(dobText));
          //source: https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off
          dob = dob.getTime() + Math.abs(dob.getTimezoneOffset() * 60000);
        } catch (error) {}

        if (!name || !dob) {
          //return / show error
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.MANDATORY_FIELDS_MISSING,
            APP.MESSAGE.BODY.NAME_DOB_MISSING,
            APP.MESSAGE.TYPE.ERROR
          );
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
          })
          .catch((err) => {
            DOM_UTIL.displayError(
              dom.errorContainer,
              APP.MESSAGE.TITLE.CACHE_FAILURE,
              APP.MESSAGE.BODY.NEW_PERSON_FAIL,
              APP.MESSAGE.TYPE.ERROR
            );
          });
      },
      downloadPerson(params) {
        const person = { ...APP.currentPerson };
        delete person["newEntry"];
        if (!person) return;

        const filename = `${person.name}_${UTIL.getFilename(person.id)}`;

        let file = new File([JSON.stringify(person)], filename, {
          type: "application/json",
        });
        let a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = filename;
        a.click();
      },
      deletePerson(params) {
        const { dataSource } = params;
        const dom = APP.pages.add_edit_person.dom;
        if (!dataSource || !dataSource.dataset.id) {
          //This error should not happen
          DOM_UTIL.displayContactDeveloperError(dom.errorContainer);
          return;
        }
        const id = dataSource.dataset.id;

        APP.data.cacheRef
          .delete(UTIL.getFilename(APP.currentPerson.id))
          .then((_) => {
            const idx = APP.data.sst.findIndex((person) => person.id === id);
            if (idx >= 0) {
              APP.data.sst.splice(idx, 1);
            }
            APP.navigate("home");
          })
          .catch((err) => {
            //almost impossible to catch
            DOM_UTIL.displayError(
              dom.errorContainer,
              APP.MESSAGE.TITLE.CACHE_FAILURE,
              APP.MESSAGE.BODY.DELETE_PERSON_FAIL,
              APP.MESSAGE.TYPE.ERROR
            );
          });
      },
    },
    gift_ideas: {
      id: "gift_ideas",
      dom: {
        main: undefined,
        container: undefined,
        title: undefined,
        errorContainer: undefined,
      },
      readDom() {
        const main = document.getElementById("gift_ideas");
        if (main) {
          APP.pages.gift_ideas.dom.main = main;
          APP.pages.gift_ideas.dom.container = main.querySelector(".container");
          APP.pages.gift_ideas.dom.title = main.querySelector("h2");
          APP.pages.gift_ideas.dom.errorContainer =
            main.querySelector("#error-container");
        }
      },
      removeError() {
        APP.pages.gift_ideas.dom.errorContainer.innerHTML = "";
      },
      buildPage() {
        APP.pages.gift_ideas.removeError();
        const dom = APP.pages.gift_ideas.dom;
        const container = dom.container;
        if (!container) {
          DOM_UTIL.displayContactDeveloperError(dom.errorContainer);
          return;
        }
        let html = "";
        dom.title.innerHTML = `Gift ideas for ${APP.currentPerson.name}`;
        if (
          APP.currentPerson.gifts &&
          Array.isArray(APP.currentPerson.gifts) &&
          APP.currentPerson.gifts.length > 0
        ) {
          html += `<ul class="list--container  gift--container">`;
          html += APP.currentPerson.gifts
            .map((gift) => {
              let result = UTIL.parseTextToURL(gift.url);
              let href =
                result.validURL == true
                  ? `<a href="${result.value}" target="_blank">${gift.url}</a>`
                  : `${gift.url}`;

              return `<li data-giftr="data_source" data-id="${gift.id}" data-source="gift" class="list--container--item gift--list--item" >
                  <h2 class="list--item--text_xl gift--name">${gift.name}</h2>
                  <h3 class="list--item--text_small gift--store">Store: ${gift.store}</h3>
                  <h3 class="list--item--text_small gift--url">${href}</h3>
                  <div data-giftr_action="edit_gift" class="button--container edit--button--container">
                    <span class="material-symbols-outlined btn  gift-page-btn">edit</span>
                  </div>
                  <div data-giftr_action="delete_gift" class="button--container delete--button--container">
                  <span class="material-symbols-outlined btn gift-page-btn">delete</span>
                  </div>
                </li>`;
            })
            .join(" ");

          html += "</ul>";
        } else {
          // there are no gifts

          html = `<h3 class="empty--list-warning">Why don't you click the plus (+) button, and add gifts ideas for ${APP.currentPerson.name}?</h3>`;
        }
        container.innerHTML = html;
      },
      listGifts(param) {
        const { dataSource } = param;
        APP.assignCurrentPerson(dataSource.dataset.id);
        APP.navigate("gift_ideas");
      },
      editGift(param) {
        const { dataSource } = param;
        const giftID = dataSource.dataset.id;
        const personID = APP.currentPerson.id;
        const dom = APP.pages.gift_ideas.dom;

        let giftIndex = -1;

        try {
          giftIndex = APP.currentPerson.gifts.findIndex(
            (gift) => gift.id === giftID
          );
        } catch (error) {
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.UNEXPECTED,
            APP.MESSAGE.BODY.ENTRY_NOT_EXISTS,
            APP.MESSAGE.TYPE.ERROR
          );
        }
        //
        if (giftIndex >= 0) {
          APP.currentGift = {
            ...APP.currentPerson.gifts[giftIndex],
            newEntry: false,
          };
          APP.navigate("add_edit_gift");
        }
      },
      deleteGift(param) {
        // Update the cache first, and then update the SST array data.

        const { dataSource } = param;
        const giftID = dataSource.dataset.id;
        const personID = APP.currentPerson.id;
        const dom = APP.pages.gift_ideas.dom;

        if (!giftID || !personID) {
          //display error
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.RECORD_NOT_FOUND,
            APP.MESSAGE.BODY.ENTRY_NOT_EXISTS,
            APP.MESSAGE.TYPE.ERROR
          );
          return;
        }
        const personIdx = APP.data.sst.findIndex(
          (person) => person.id === personID
        );

        if (personIdx < 0) {
          //display error
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.RECORD_NOT_FOUND,
            APP.MESSAGE.BODY.ENTRY_NOT_EXISTS,
            APP.MESSAGE.TYPE.ERROR
          );
          return;
        }

        const copy = APP.data.sst[personIdx];

        let giftIdx = -1;
        if (copy.gifts && Array.isArray(copy.gifts) && copy.gifts.length > 0) {
          giftIdx = copy.gifts.findIndex((gift) => (gift.id = giftID));
        }
        if (giftIdx >= 0) {
          copy.gifts.splice(giftIdx, 1);
        }
        APP.data.cacheRef
          .put(UTIL.getFilename(copy.id), new Response(JSON.stringify(copy)))
          .then((result) => {
            //all good, update the sst
            APP.data.sst[personIdx] = copy;
            APP.navigate("gift_ideas");
          })
          .catch((err) => {
            // console.error(err);
            DOM_UTIL.displayError(
              dom.errorContainer,
              APP.MESSAGE.TITLE.CACHE_FAILURE,
              APP.MESSAGE.BODY.DELETE_GIFT_FAIL,
              APP.MESSAGE.TYPE.ERROR
            );
          });
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
        errorContainer: undefined,
      },
      getUserValues() {
        const dom = APP.pages.add_edit_gift.dom;
        return {
          name: dom.name.value.trim(),
          store: dom.store.value.trim(),
          url: dom.url.value.trim(),
        };
      },
      removeError() {
        APP.pages.add_edit_gift.dom.errorContainer.innerHTML = "";
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
          dom.errorContainer = main.querySelector("#error-container");
        }
      },
      buildPage() {
        APP.pages.add_edit_gift.removeError();
        const dom = APP.pages.add_edit_gift.dom;
        let title = `Add Gift - ${APP.currentPerson.name}`;
        if (APP.currentGift.newEntry === false) {
          title = `Edit Gift - ${APP.currentGift.name} -  ${APP.currentPerson.name}`;
        }
        dom.title.innerHTML = title;
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
        const dom = APP.pages.add_edit_gift.dom;

        if (!userValues.name) {
          DOM_UTIL.displayError(
            dom.errorContainer,
            APP.MESSAGE.TITLE.MANDATORY_FIELDS_MISSING,
            APP.MESSAGE.BODY.GIFT_NAME_MISSING,
            APP.MESSAGE.TYPE.ERROR
          );
          return;
        }

        if (!APP.currentPerson.id) {
          // display error
          DOM_UTIL.displayContactDeveloperError(dom.errorContainer);
          return;
        }

        const giftToAdd = {
          id: APP.currentGift.id,
          name: userValues.name,
          store: userValues.store,
          url: userValues.url,
        };

        let addGiftFilename = UTIL.getFilename(APP.currentPerson.id);
        const personIdx = APP.data.sst.findIndex(
          (person) => person.id === APP.currentPerson.id
        );
        let giftIdx = -1;
        let personObj = null;

        if (personIdx >= 0) {
          personObj = { ...APP.data.sst[personIdx] };
          giftIdx = personObj.gifts.findIndex(
            (gift) => gift.id === APP.currentGift.id
          );
          if (giftIdx >= 0) {
            personObj.gifts[giftIdx] = giftToAdd;
          } else {
            personObj.gifts.push(giftToAdd);
          }
        }

        APP.data.cacheRef
          .match(addGiftFilename)
          .then((matchResult) => {
            if (matchResult) {
              return matchResult.json();
            }
          })
          .then((person) => {
            //add it to cache before adding it to the array in memory
            if (personObj) {
              return APP.data.cacheRef.put(
                addGiftFilename,
                new Response(JSON.stringify(personObj))
              );
            }
            throw new Error("Person entry could not be located");
          })
          .then((_) => {
            //we were able to update the cache. It means we can update the array now
            if (personObj) {
              APP.data.sst[personIdx] = personObj;
            }
            APP.currentGift = null;
            APP.navigate("gift_ideas");
          })
          .catch((err) => {
            DOM_UTIL.displayError(
              dom.errorContainer,
              APP.MESSAGE.TITLE.UNEXPECTED,
              err.message,
              APP.MESSAGE.TYPE.ERROR
            );
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
      case "delete_gift":
        APP.pages.gift_ideas.deleteGift(params);
        break;
      case "edit_gift":
        APP.pages.gift_ideas.editGift(params);

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
