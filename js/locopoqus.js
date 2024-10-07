locopoqus = {};

const html_template = `<!DOCTYPE html>
<html>
  <head>
    <meta charset=utf-8>
    <link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900|Material+Icons" rel="stylesheet" type="text/css">
    <link href="https://cdn.jsdelivr.net/npm/quasar@2.17.0/dist/quasar.prod.css" rel="stylesheet" type="text/css">
    <link rel="stylesheet" href="/static/themes.css" />
    <link rel="stylesheet" href="/static/themes-base16.css" />
    <link rel="stylesheet" href="/static/simple-code-editor.css" />
  </head>
  <body>
    <div id="q-app">
{PAGE_TEMPLATE}
    </div>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/quasar@2/dist/quasar.umd.prod.js"></script>
    <script src="/static/highlight.min.js"></script>
    <script src="/static/simple-code-editor.js"></script>
    <script>
      const { createApp, ref } = Vue;
      const { useQuasar } = Quasar;

      const app = createApp({
        components: {
          "code-editor": CodeEditor,
        },
        setup () {
          {REFS}
          const $q = useQuasar();
          const leftDrawerOpen = ref(false);
          const SESSION = {SESSION};
          const data = ref(\'console.log("Hello, World!");\');
          const theme = ref($q.dark.isActive?"github-dark":"github");
          return {
            data,
            theme,
            {VARIABLES}
            leftDrawerOpen,
            SESSION, 
            {FUNCTIONS}
            async toggleDarkMode () {
              $q.dark.toggle();
              if ($q.dark.isActive) {
                theme.value = "github-dark";
              } else {
                theme.value = "github";
              }
              const request = new Request("/" + window.location.pathname.split("/")[1] + "/call/setAppDark", {
                method: "POST",
                body: JSON.stringify({ session: SESSION, app_dark: $q.dark.isActive }),
              });
              await fetch(request);
            },
            toggleLeftDrawer () {
              leftDrawerOpen.value = !leftDrawerOpen.value;
            }
          };
        }
      });
      app.use(Quasar, {
        config: {
          dark: {APP_DARK}
        }
      });
      app.mount("#q-app");
    </script>
  </body>
</html>`;

locopoqus.response = function (path, method, parameters, body) {
  plv8.elog(INFO, parameters + " " + body);
  if (parameters === "") {
    parameters = {};
  } else {
    parameters = JSON.parse(parameters);
  }
  if (body !== "") {
    body = JSON.parse(body)
    for (const attribute in body) {
      parameters[attribute] = body[attribute];
    }
  }
  plv8.elog(INFO, JSON.stringify(parameters));
  const [_, application_name, page_name, remote_call] = path.split("/");
  if (remote_call === undefined) {
    const page = plv8.execute("SELECT applications.id as application_id, pages.id as page_id FROM locopoqus.pages INNER JOIN locopoqus.applications ON pages.application_id = applications.id WHERE applications.name=$1 AND pages.name=$2", [application_name, page_name]);
    if (page.length === 0) {
      return "";
    }
    const session = plv8.execute("SELECT id FROM locopoqus.sessions WHERE uuid=$1", [parameters.session]);
    if (session.length === 0) {
      const uuid = plv8.execute("SELECT gen_random_uuid() as uuid")[0].uuid;
      const session_id = plv8.execute("INSERT INTO locopoqus.sessions (uuid) VALUES ($1) RETURNING id", [uuid])[0].id;
      plv8.elog(INFO, JSON.stringify(session_id));
      //const session_id = plv8.execute("SELECT id FROM locopoqus.sessions WHERE uuid = $1", [uuid])[0].id;
      plv8.execute("INSERT INTO locopoqus.session_values (session_id, key, value) VALUES ($1, $2, $3)", [session_id, "APP_DARK", "\"auto\""]);
      return `<!DOCTYPE html>
        <html>
        <body onload="window.location.replace('${path}?session=${uuid}');">
        </body>
        </html>
      `;
    }
    parameters.session_id = session[0].id;
    locopoqus.update_session(parameters);
    parameters.application_id = page[0].application_id;
    parameters.page_id = page[0].page_id;
    return locopoqus.render_page(parameters);
  } else {
    const session = plv8.execute("SELECT id FROM locopoqus.sessions WHERE uuid=$1", [parameters.session]);
    if (session.length === 0) {
      return "";
    }
    if (page_name === "call") {
      parameters.session_id = session[0].id;
      plv8.elog(INFO, "remote call: " + remote_call + "(" + JSON.stringify(parameters) + ")");
      return eval("locopoqus." + remote_call + "(" + JSON.stringify(parameters) + ")");
    } else {

    }
  }
};

locopoqus.update_session = function (parameters) {

};

locopoqus.render_page = function (parameters) {
  let page_template = plv8.execute("SELECT templates.html FROM locopoqus.templates INNER JOIN locopoqus.pages ON templates.id = pages.template_id WHERE pages.id = $1", [parameters.page_id])[0].html;
  const application = plv8.execute("SELECT applications.title, applications.logo, applications.logo_width FROM locopoqus.applications INNER JOIN locopoqus.pages ON applications.id = pages.application_id WHERE pages.id = $1", [parameters.page_id])[0];
  const toolbar = `            <q-img src="${application.logo}" height="50px" width="${application.logo_width}px" position="100% 50%" fit="scale-down"></q-img>
            <q-toolbar-title>${application.title}</q-toolbar-title>
            <q-space></q-space>
            <q-btn flat round color="white" icon="dark_mode" @click="toggleDarkMode"></q-btn>`;
  const content = `<q-card style="max-width: 1200px; width: 85vw; height: 80vh" class="column">
      <q-card-section class="col">
       <code-editor v-model="data" line-nums="true" font-size="13px" width="100%" border-radius="1px" :theme="theme"></code-editor>
      </q-card-section>
    </q-card>`;
  page_template = page_template.replace("{TOOLBAR}", toolbar).replace("{MENU}", "").replace("{CONTENT}", content).replace("{FOOTER}", "          <q-toolbar> Build with LoCoPoQuS! </q-toolbar>");
  const APP_DARK = plv8.execute("SELECT value FROM locopoqus.session_values WHERE session_id = $1 AND key = 'APP_DARK'", [parameters.session_id])[0].value
  return html_template.replace("{PAGE_TEMPLATE}", page_template).replace("{REFS}", "").replace("{VARIABLES}", "").replace("{FUNCTIONS}", "").replace("{SESSION}", "\"" + parameters.session + "\"").replaceAll("{APP_DARK}", APP_DARK);
};

locopoqus.setAppDark = function (parameters) {
  plv8.execute("UPDATE locopoqus.session_values SET value = $1 WHERE session_id = $2 AND key = 'APP_DARK'", [parameters.app_dark, parameters.session_id]);
  return "ok";
}