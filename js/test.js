const dateText = "1977-02-17";

const date = new Date(Date.parse(dateText));

let int = date.getTime() + Math.abs(date.getTimezoneOffset() * 60000);
// int += 10;
const d2 = new Date(int);

console.log(date.getTime(), date.toDateString());
console.log(d2.getTime(), d2.toDateString());
