moment.locale('nb');
let current = 0;
let pastEvents = undefined;

const html = {
    gid: el => document.getElementById(el),

    el: el => document.createElement(el),

    // add class names
    cn: (el, cn) => el.classList.add(cn),

    // element add, return child
    ela: (el, ch) => {
        el.appendChild(ch);
        return ch;
    },

    // element add, return parent
    elap: (el, ch) => {
        el.appendChild(ch);
        return el;
    },

    // create element, add class names
    elp: (e, p) => {
        const element = html.el(e);
        if (p && p.indexOf(' ') > -1) p.split(' ').forEach(c => html.cn(element, c));
        else if (p && Array.isArray(p)) p.forEach(c => html.cn(element, c));
        else if (p && p.indexOf(' ') === -1) html.cn(element, p);
        return element;
    }
};

function loadMeetups() {
    return getOSWAEvents()
        .then(events => {
            return parseEvents(events);
        });
}

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

function showMore() {
    current += 3;
    let end = current;

    if (current >= pastEvents.length) {
        end = pastEvents.length;
        document.querySelector( "#showMoreBtn").classList.add("disabled");
    }

    const events = pastEvents.slice(0, end);
    render("#pastTemplate", "pastMeetupList", events);
}

function loadPhotoAlbums() {
    const grid = html.ela(
        html.elp('div', 'box alt'),
        html.elp('div', 'row gtr-uniform')
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

    shuffleArray(imageUrls).forEach(sample => {
        let gridCell = html.elp('div', 'col-3');
        const img = html.ela(
            html.ela(gridCell, html.elp('span', 'image fit')),
            html.el('img')
        );
        img.setAttribute('src', sample.photo_link);
        img.setAttribute('alt', sample.title);
        html.ela(grid, gridCell);
    });

    const container = html.gid('communityPhotosGrid');
    html.ela(container, grid);
}

function shuffleArray(arr) {
    const array = arr.slice();

    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
}

function loadPhotoAlbumCircles() {
    let imageCircles = elp('div', 'image-circles');

    for (let i = 0; i < 3; i++) {
        const imageContainer = ela(
            imageCircles,
            elp('div', 'images')
        );

        for (let j = 0; j < 3; j++) {

            let gridCell = elp('span', 'image');
            const img = el('img');
            img.setAttribute('src', 'images/oswa-logo-s.jpeg');
            img.setAttribute('alt', 'event photo');

            ela(imageContainer, elap(gridCell, img));
        }
    }

    const container = gid('communityPhotosGrid');
    ela(container, imageCircles);
}

function render(templateName, element, data) {
    if (!data || data.length === 0) return;
    const template = $.templates(templateName);
    document
        .getElementById(element)
        .innerHTML = template.render({events: data});
}

function getOSWAEvents() {
  return getEvents("https://api.meetup.com/Oslo-Software-Architecture/events" + getFields() + getSigns());
}

function getEvents(url) {
    return $.ajax({
        url: url,
        dataType: 'jsonp'}).then(result => {
        return result.data;
    })
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
      "event_hosts", // .name, .intro, .photo.photo_link, .join_date,  .photo.thumb_link, .photo.highres_link
      "featured", // Boolean indicator of whether or not a given event is featured,
      "photo_album"
  ];

  const allFields = fields.reduce((p, n) => p + "," + n);
  //console.log(allFields);
  return "?&photo-host=public&&scroll=future_or_past&page=20&fields="+allFields;
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

loadMeetups().then(result => {
    loadPhotoAlbums();
});