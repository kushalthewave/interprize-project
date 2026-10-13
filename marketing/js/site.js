/* ==================================================================
   The Code Crafters — shared site script.

   Three small jobs and nothing else: the shadow under the sticky bar,
   the menu button on a narrow screen, and the year in the footer. The
   site makes no network requests after it has loaded, sets no cookies
   and loads no third-party script, which is why there is no consent
   banner anywhere on it.
   ================================================================== */
(function () {
  'use strict';

  /* The address enquiries are sent to. It is in one place on purpose:
     change it here and every page follows. */
  var CONTACT_EMAIL = 'thecodecrafters.cet257@gmail.com';

  // ---- sticky bar ----------------------------------------------------
  var bar = document.querySelector('header');
  if (bar) {
    var onScroll = function () {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      bar.classList.toggle('stuck', y > 8);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- menu button ---------------------------------------------------
  var btn = document.querySelector('.menu-btn');
  var menu = document.querySelector('.nav nav');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // A wide window has no menu button, so a panel left open there would
    // be stranded on top of the page.
    addEventListener('resize', function () {
      if (innerWidth > 860) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- year ----------------------------------------------------------
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- email addresses -----------------------------------------------
  // Written in by script rather than sitting in the markup, which keeps the
  // address out of the easiest address harvesters without hiding it from
  // anyone who actually wants to write to us.
  Array.prototype.forEach.call(document.querySelectorAll('[data-email]'), function (el) {
    el.textContent = CONTACT_EMAIL;
    el.setAttribute('href', 'mailto:' + CONTACT_EMAIL);
  });

  // ---- enquiry form --------------------------------------------------
  // There is no server behind this site, so the form composes a message in
  // whatever mail client the visitor already uses. That is stated on the
  // page rather than hidden: nothing is submitted anywhere, and no detail
  // typed here is stored or sent until the visitor presses send themselves.
  var form = document.querySelector('form.enquiry');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var get = function (name) {
        var el = form.elements[name];
        return el && el.value ? String(el.value).trim() : '';
      };
      var subject = 'Enquiry from the website: ' + (get('topic') || 'General');
      var body = [
        'Name: ' + get('name'),
        'Organisation: ' + get('org'),
        'Email: ' + get('email'),
        'Interested in: ' + get('topic'),
        '',
        get('message'),
      ].join('\n');

      location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      var note = document.getElementById('sent-note');
      if (note) note.hidden = false;
    });
  }
})();
