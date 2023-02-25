const template = document.createElement("template");

template.innerHTML = `
    <style>

    @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0");

    :host {
        display: block;
        --bg-error: #d84933;
        --bg-success: #57a344;
        --bg-info: #4088f1;
        --bg-warning: #f19412;
        --text-color: #ffffff;
        --stroke-color: #ffffff;
      }


  
      
      .message {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        color: var(--text-color);
        border-radius: 0.25rem;
        gap: 1rem;
        padding: 0.5rem 1rem;

      }

      p{
        margin: 0;
        padding: 0;
      }
      
      .icon {
        color: var(--stroke-color);
        font-size: 3rem;
      }
      
      .error {
        background-color: var(--bg-error);
      }
      
      .success {
        background-color: var(--bg-success);
      }
      .info {
        background-color: var(--bg-info);
      }
      .warning {
        background-color: var(--bg-warning);
      }

      .title{
        font-size: 2rem;
      }

      .actions{
        // text-align: c;
      }

      .message__container{
        // flex: 1;
      }
      

    /* You can use ::slotted() to style the injected content. */
    </style>

    <div class="message">
        <div class="icon__container">
            <span class="material-symbols-outlined icon" id="icon">info</span>
        </div>
        <div class="message__container">
            <slot name="title">Default Title</slot>
            <slot name="message">A message full of sound and fury, signifying nothing.</slot>
            <p class="actions">
                <button><slot name="done"></slot></button>
            </p>
        </div>
    </div>

`;

class MessageBox extends HTMLElement {
  static #DEFAULT_REMOVAL = 3000; //3 seconds
  #timer = null;
  div = null;
  icon = null;
  title = null;
  message = null;
  button = null;
  buttonDiv = null;
  #id = ""; // doesn't work

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "closed" });
    const clone = template.content.cloneNode(true);
    this.root.append(clone);
    this.#id = crypto.randomUUID();

    this.div = this.root.querySelector("div.message");
    this.icon = this.root.querySelector(`#icon`);
    this.title = this.root.querySelector(`slot[name="title"]`);
    this.message = this.root.querySelector(`slot[name=message]`);
    this.buttonDiv = this.root.querySelector(`p.actions`);
    this.button = this.root.querySelector(`p.actions button`);
  }

  static get observedAttributes() {
    //type: info, error, success, warning
    //action: the function to call from window object
    //removal: the button will remove itself from the page

    return ["type", "removal", "action", "msgId"];
  }

  set type(val) {
    val = val.toLowerCase().trim();
    if (
      val === "info" ||
      val === "error" ||
      val === "success" ||
      val === "warning"
    ) {
      this.setAttribute("type", val);
    }
  }
  get type() {
    return this.getAttribute("type");
  }

  set msgId(val) {
    this.setAttribute("msgId", val);
  }

  get msgId() {
    return this.getAttribute("msgId");
  }

  set removal(val) {
    try {
      const valInt = Math.abs(Number.parseInt(val));
      if (Number.isInteger(valInt)) {
        this.setAttribute("removal", val);
      }
    } catch (error) {}
  }
  get removal() {
    return this.getAttribute("removal");
  }

  set action(val) {
    if (val in window && typeof window[val] === "function") {
      this.setAttribute("action", val);
    } else {
      this.setAttribute("action", null);
    }
  }
  get action() {
    let action = this.getAttribute("action");
    if (action in window && typeof window[action] === "function") {
      return action;
    } else {
      return null;
    }
  }
  removeMessageBoxAfterDelay() {
    const action = this.getAttribute("action");

    if (action && this.button) {
      this.button.addEventListener("click", this.handleCloseButton.bind(this));
    } else {
      if (this.removal) {
        //not implemented
      }
    }
  }

  handleCloseButton(ev) {
    // const action = this.getAttribute("action");
    // window["closeMessage"](this.#id);
    // console.log("result: ", "closeMessage" in window); //not working with "closed" mode
    const event = new CustomEvent("closeMessage", {
      detail: { msgId: this.msgId },
    });

    document.dispatchEvent(event);
  }

  connectedCallback() {
    //depending on what's given...

    //remove the title slot if no content provided
    this.div.classList.add(this.type || "error");

    let titleSlot = this.div.querySelector('slot[name="title"]');
    if (titleSlot && titleSlot.assignedNodes().length === 0) {
      titleSlot.remove();
    }

    //remove the message slot if no message provided
    let messageSlot = this.div.querySelector('slot[name="message"]');
    if (messageSlot && messageSlot.assignedNodes().length === 0) {
      messageSlot.remove();
    }

    //remove the p that holds the button if no content provided
    let btnSlot = this.div.querySelector(".actions slot");
    if (btnSlot && btnSlot.assignedNodes().length === 0) {
      btnSlot.closest("p.actions").remove();
      //update the this.div css classList
    }

    this.div.setAttribute("message-id", this.#id);
    this.removeMessageBoxAfterDelay();
  }
}

window.customElements.define("message-box", MessageBox);

export default MessageBox;
