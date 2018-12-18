moment.locale('nb');
let current = 0;
let pastEvents = undefined;

/**
 * Type that makes it easier to construct HTMLElement objects.
 * This is used to dynamically create the OSWA photo matrix.
 */
const html = {
    /**
     * Short-hand function to get elements by id.
     * @param el the element to get
     * @returns {HTMLElement} the dom element
     */
    getId: el => document.getElementById(el),

    /**
     * Creates new dom elements.
     * @param el type of element to create
     * @returns {HTMLElement} the created dom element
     */
    element: el => document.createElement(el),

    /**
     * Add a single class name (multiple names
     * separated by white space are not allowed).
     * @param el the dom element to update
     * @param cn the class name to add
     */
    className: (el, cn) => el.classList.add(cn),

    /**
     * Add a child element and return the child.
     * @param el Parent dom element
     * @param ch Child dom element
     * @returns {HTMLElement} The added child element
     */
    elementChildAdd: (el, ch) => {
        el.appendChild(ch);
        return ch;
    },

    /**
     * Add a child element and return the parent.
     * @param el Parent dom element
     * @param ch Child dom element
     * @returns {HTMLElement} The parent element
     */
    elementParentAdd: (el, ch) => {
        el.appendChild(ch);
        return el;
    },

    /**
     * Create a new element and add class names if any.
     * @param el Ttype of element to create
     * @param classnames The class names to add. Can be a white spaces separated string or an array.
     * @return {*|HTMLElement}
     */
    elementClass: (el, classnames) => {
        const element = html.element(el);
        if (classnames && classnames.indexOf(' ') > -1) classnames.split(' ').forEach(c => html.className(element, c));
        else if (classnames && Array.isArray(classnames)) classnames.forEach(c => html.className(element, c));
        else if (classnames && classnames.indexOf(' ') === -1) html.className(element, classnames);
        return element;
    }
};

/**
 * Makes a call to the Meetup.com API and returns a promise.
 * The call uses signatures that cannot be changed.
 * Goto https://secure.meetup.com/meetup_api/console/?path=/:urlname/events
 * if you need to change the parameters of the call.
 *
 * @returns {PromiseLike<T|never>|Promise<T|never>|*}
 */
function getOSWAEvents() {
    return getEvents("https://api.meetup.com/Oslo-Software-Architecture/events" + getFields() + getSigns());
}

/**
 * See Meetup.com API docs for more
 * information:
 * https://www.meetup.com/meetup_api/docs/
 *
 * @returns {string} URL with field parameters combined.
 */
function getFields() {
    const fields = [
        "id",
        "featured_photo",
        "short_link", // A shortened link for the event on meetup.com
        "rsvp_limit", // The number of "yes" RSVPS an event has capacity for
        "how_to_find_us",
        "event_hosts", // .name, .intro, .photo.photo_link
        "featured", // Boolean indicator of whether or not a given event is featured,
        "photo_album"
    ];

    const allFields = fields.reduce((p, n) => p + "," + n);
    //console.log(allFields);
    return "?&photo-host=public&&scroll=future_or_past&page=20&fields="+allFields;
}

/**
 * Returns a Promise that resolves when the HTTP call
 * is successfully done.
 *
 * @param url
 * @returns {PromiseLike<T | never> | Promise<T | never> | *}
 */
function getEvents(url) {
    return $.ajax({
        url: url,
        dataType: 'jsonp'}).then(result => {
        return result.data;
    })
}

/**
 * Loads, parses and renders events from meetup.com in a Promise-chain.
 *
 * @returns {PromiseLike<any | never> | Promise<any | never>}
 */
function loadMeetups() {
    return getOSWAEvents()
        .then(events => {
            return parseEvents(events);
        });
}

/**
 * Creates a Promise around the rendering that resolves
 * only when the templating process is complete.
 *
 * @param data JSON array containing events.
 * @returns {Promise<any>} Resolves with empty function when done.
 */
function parseEvents(data) {
  if (data && Array.isArray(data)) {
    return new Promise((resolve, reject) => {
        try {
            templateEvents(data);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
  } else {
    console.error("JSON data has invalid format.", data);
    throw new Error("JSON data must be an array.");
  }
}

/**
 * Reads the JSON data from meetup.com
 * and prepares the results for rendering.
 *
 * @param data JSON data from meetup.com
 */
function templateEvents(data) {
  if (!data || data.length === 0) return;

  const eventArray = [];
  data.forEach(event => {
    const format = event.status === 'upcoming' ? 'LLLL' : 'L';
    const name = event.name;
    const description = event.description;
    const time = moment(new Date(event.time)).format(format); // UTC start time of the event, in milliseconds since the epoch
    const shortlink = event.short_link;
    const venue = event.venue;
    const yes_rsvp_count = event.yes_rsvp_count;
    const waitlist_count = event.waitlist_count;
    const web_actions = event.web_actions;
    const status = event.status;
    const photo_album = event.photo_album;
    eventArray.push({
        id: event.id,
        name,
        description,
        status,
        time: time.charAt(0).toUpperCase() + time.slice(1),
        shortlink, venue, yes_rsvp_count, waitlist_count, web_actions,photo_album
    });
    console.log(event);
  });

  pastEvents = eventArray.filter(event => event.status === 'past').reverse();
  const upcoming = eventArray.filter(event => event.status === 'upcoming');

  showMore();
  render("#upcomingTemplate", "upcomingMeetupList", upcoming);
}

document.querySelector( "#showMoreBtn").addEventListener('click', () => {
    showMore()
});

/**
 * Renders an increasing amount of events with every click
 * to the #showMoreBtn button.
 */
function showMore() {
    current += 3;
    let end = current;

    if (current >= pastEvents.length) {
        end = pastEvents.length;
        document.querySelector( "#showMoreBtn").classList.add("disabled");
    }

    // make shallow copy of the event array and then render them separately.
    const events = pastEvents.slice(0, end);
    render("#pastTemplate", "pastMeetupList", events);
}

/**
 * Creates a photo matrix that follows the DOM-structure set by the
 * Prototype template by Pixelarity.com.
 */
function loadPhotoAlbums() {
    const grid = html.elementChildAdd(
        html.elementClass('div', 'box alt'),
        html.elementClass('div', 'row gtr-uniform')
    );

    const imageUrls = [];

    pastEvents.forEach(event => {
        if (event.photo_album && event.photo_album.photo_sample) {
            event.photo_album.photo_sample.forEach(sample => {
                sample.title = event.photo_album.title;
                imageUrls.push(sample);
            })
        }
    });

    const imageMap = [];
    let randomImages = shuffleArray(imageUrls);
    randomImages.forEach(sample => {
        let gridCell = html.elementClass('div', 'col-3');
        const img = html.elementChildAdd(
            html.elementChildAdd(gridCell, html.elementClass('span', 'image fit')),
            html.element('img')
        );
        img.setAttribute('src', 'images/clear.png');
        img.setAttribute('alt', sample.title);
        html.elementChildAdd(grid, gridCell);
        imageMap.push({el: img, sample, gridCell, grid});
    });

    const container = html.getId('communityPhotosGrid');
    html.elementChildAdd(container, grid);

    asyncImageLoad(imageMap);
}

/**
 * Asynchronous image preloading, that also removes images
 * that were taken in portrait orientation. The latter causes
 * the photo matrix to look horizontally uneven. This filtering
 * is the first step in order to deal with that issue.
 *
 * @param imageMap
 */
function asyncImageLoad(imageMap) {
    imageMap.forEach(image => {
        const preLoadImg = new Image();
        preLoadImg.onload = function () {
            let orientation;
            if (preLoadImg.naturalWidth > preLoadImg.naturalHeight) {
                orientation = 'landscape';
                image.el.src = this.src;
            } else if (preLoadImg.naturalWidth < preLoadImg.naturalHeight) {
                orientation = 'portrait';
                image.grid.removeChild(image.gridCell);
            } else {
                orientation = 'even';
                image.el.src = this.src;
            }
        };

        preLoadImg.src = image.sample.photo_link;
    })
}

/**
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(arr) {
    const array = arr.slice();

    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
}

function loadPhotoAlbumCircles() {
    let imageCircles = html.elementClass('div', 'image-circles');

    for (let i = 0; i < 3; i++) {
        const imageContainer = html.elementChildAdd(
            imageCircles,
            html.elementClass('div', 'images')
        );

        for (let j = 0; j < 3; j++) {
            let gridCell = html.elementClass('span', 'image');
            const img = html.element('img');
            img.setAttribute('src', 'images/oswa-logo-s.jpeg');
            img.setAttribute('alt', 'event photo');

            html.elementChildAdd(imageContainer, html.elementParentAdd(gridCell, img));
        }
    }

    const container = html.getId('communityPhotosGrid');
    html.elementChildAdd(container, imageCircles);
}

function render(templateName, element, data) {
    if (!data || data.length === 0) return;
    const template = $.templates(templateName);
    document
        .getElementById(element)
        .innerHTML = template.render({events: data});
}

function recap(response) {
    $.ajax({
        type: "POST",
        url: 'https://www.google.com/recaptcha/api/siteverify',
        data: JSON.stringify({
            secret: '',
            response: response,

        }),
        success: function (result) {

        },
        dataType: dataType
    });
}

function sendToSlack(url, text) {
    return new Promise(resolve => {
        $.ajax({
            data: 'payload=' + JSON.stringify({
                "text": text
            }),
            dataType: 'json',
            processData: false,
            type: 'POST',
            url: url,
            success: function (result) {
                resolve();
            }
        });
    })
}

function sendToSlack2(url, text) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: 'payload=' + JSON.stringify({
                "text": text
            })
        })
        .then(function (result) {
            resolve(result);
        })
        .catch(function (err) {
            reject(err);
        })
    })
}

function getSigns() {
    return "&sig_id=35117512&sig=9ed5bc0ed689f88e22fee868a4fa215fddd4a35f" // 10 = d42fecb23546e55dc7f0b799b2191371812462c5 // 20 = 9ed5bc0ed689f88e22fee868a4fa215fddd4a35f
}

loadMeetups().then(() => {
    loadPhotoAlbums();
});