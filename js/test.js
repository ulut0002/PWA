const dateText = "1977-02-17";

const date = new Date(Date.parse(dateText));

let int = date.getTime() + Math.abs(date.getTimezoneOffset() * 60000);
// int += 10;
const d2 = new Date(int);

console.log(date.getTime(), date.toDateString());
console.log(d2.getTime(), d2.toDateString());

const url = new URL("https://www.google.com");
console.log(url);

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
