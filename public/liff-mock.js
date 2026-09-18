/**
 * Local LIFF Simulator
 * ---------------------
 * Simulates a logged-in LINE staff user so the LIFF staff app can be tested
 * in a normal browser WITHOUT any real LINE credentials.
 *
 * Activate by adding ?liff=mock to the URL, e.g.:
 *   http://localhost:3000/liff/staff?liff=mock
 *   https://line-oa-ps-copilot.vercel.app/liff/staff?liff=mock
 *
 * When the flag is absent, this script does NOTHING and the real LINE LIFF
 * SDK (loaded just above in index.html) is used unchanged. So production and
 * real-LINE testing are completely unaffected.
 *
 * The simulated identity matches CURRENT_STAFF in src/data/mockGroceryDataLake.ts
 * so the app behaves as if a real Tops staff member opened it inside LINE.
 */
(function () {
  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    return;
  }
  if (params.get('liff') !== 'mock') return; // no-op in normal / real-LINE mode

  var MOCK_STAFF = {
    displayName: 'Somchai Prasert',
    userId: 'U-STAFF-BKK-104',
    statusMessage: 'Produce Specialist · CentralWorld',
    pictureUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  };

  function log() {
    var args = ['[LIFF-MOCK]'].concat(Array.prototype.slice.call(arguments));
    console.info.apply(console, args);
  }

  var mockLiff = {
    isInClient: function () {
      return true;
    },
    isLoggedIn: function () {
      return true;
    },
    init: function () {
      log('init() — simulated LIFF session for', MOCK_STAFF.displayName);
      return Promise.resolve();
    },
    getProfile: function () {
      log('getProfile() ->', MOCK_STAFF);
      return Promise.resolve(MOCK_STAFF);
    },
    getAccessToken: function () {
      return Promise.resolve('mock-liff-access-token');
    },
    getAppLanguage: function () {
      return Promise.resolve('th');
    },
    sendMessages: function (messages) {
      var text = (messages || [])
        .map(function (m) {
          return m && m.text ? m.text : m ? JSON.stringify(m) : '';
        })
        .join('\n');
      log('sendMessages() ->', text);
      // Surface the "sent" message in the UI so the Send-to-LINE action is visible.
      try {
        window.dispatchEvent(new CustomEvent('liff-mock-send', { detail: { text: text } }));
      } catch (e) {
        /* ignore */
      }
      return Promise.resolve({});
    },
    close: function () {
      log('close()');
      return Promise.resolve();
    },
    navigate: function (url) {
      log('navigate() ->', url);
      return Promise.resolve();
    },
    createTempFile: function () {
      return Promise.resolve({ tempFileId: 'mock-temp-file' });
    },
  };

  // Replace whatever the real SDK defined (or define it if the CDN failed to load).
  window.liff = mockLiff;

  log('ACTIVE — LINE LIFF is being SIMULATED (no real credentials).');
  console.info('[LIFF-MOCK] Remove ?liff=mock from the URL to use the real LINE SDK.');
})();
