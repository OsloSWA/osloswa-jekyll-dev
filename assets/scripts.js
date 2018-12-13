
function parseEvents(data) {
  if (data && Array.isArray(data)) {
    return templateEvents(data);
  } else {
    console.error("JSON data has invalid format.", data);
    throw new Error("JSON data must be an array.");
  }
}

function templateEvents(data) {
  moment.locale('no');

  const eventArray = [];
  data.forEach(event => {
    const name = event.name;
    const description = event.description;
    const time = moment(new Date(event.time)).format("dddd, MMMM DD, HH:mm");
    
    eventArray.push({name, description, time});
  });

  const jsrender = window.jsrender;
  const template = jsrender.templates("#meetupTemplate");
  const htmlOutput = template.render({events: eventArray});

  const meetupNode = document.getElementById("#replaceMeetupList");
  meetupNode.html(htmlOutput);
}

function getOSWAEvents() {
  const url = "https://api.meetup.com/Oslo-Software-Architecture/events" + getFields() + getSigns();
  return getEvents(url);
}

function getEvents(url) {
  return fetch(url, { cache: "no-cache" })
  .then(data => {
    return data.json();
  }).catch(function(ex) {
    console.error('Could not get events.', ex);
  });
}

function getFields() {
  const key = "";
  return "?&photo-host=public&page=20&fields=featured_photo%2Cshort_link%2Cpast_event_count_inclusive"; // plain_text_no_images_description // &sign=true&key=
}

function getSigns() {
    return "&sig_id=266610235&sig=8e776c0aca3b5d5673eb53f68bf9ec38d67af91f"
}

function load() {
    getOSWAEvents().then(events => {
        parseEvents(events);
    });
}

load();