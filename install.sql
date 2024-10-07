CREATE EXTENSION plv8;

CREATE SCHEMA js;

CREATE TABLE js.modules (name TEXT PRIMARY KEY, code TEXT);

CREATE OR REPLACE FUNCTION js.init()
 RETURNS void
 LANGUAGE plv8
AS $function$
load_module = function(name) {
  const rows = plv8.execute("SELECT code from js.modules " +" where name = $1", [name]);
  for (const row of rows) {
    eval("(function() { " + row.code + "})")();
  }      
};
$function$
;

ALTER DATABASE ben SET plv8.start_proc TO 'js.init';

\set locopoqus `cat js/locopoqus.js`

INSERT INTO js.modules(name, code) VALUES ('locopoqus', :'locopoqus');

CREATE OR REPLACE FUNCTION public.hello_func(url text, method text, body text)
 RETURNS text
 LANGUAGE plv8
AS $function$
let html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset=utf-8>
    <link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900|Material+Icons" rel="stylesheet" type="text/css">
    <link href="https://cdn.jsdelivr.net/npm/quasar@2.17.0/dist/quasar.prod.css" rel="stylesheet" type="text/css">
  </head>
  <body>
    <div id="q-app">
<q-layout view="hHh lpr fFf">

    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer"></q-btn>

        <q-toolbar-title>
          <q-avatar>
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo-mono-white.svg">
          </q-avatar>
          Title
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered>
      BODY
    </q-drawer>

    <q-page-container>

          <div class="q-pa-md" style="max-width: 400px">
     <q-form @reset="onReset" class="q-gutter-md" action="http://localhost:8003" method="post">
        <q-input filled v-model="email" label="Email*" name="email" lazy-rules :rules="[ val => val && val.length > 0 || 'Please type something']"></q-input>
        <q-btn label="Submit" type="submit" color="primary"></q-btn>
        <q-btn label="Reset" type="reset" color="secondary"></q-btn>
      </q-form>
     <q-dialog v-model="alert">
      <q-card>
        <q-card-section>
          <div class="text-h6">Alert</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum repellendus sit voluptate voluptas eveniet porro. Rerum blanditiis perferendis totam, ea at omnis vel numquam exercitationem aut, natus minima, porro labore.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" v-close-popup></q-btn>
        </q-card-actions>
      </q-card>
      </q-dialog>
    </div>
    </q-page-container>

    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-avatar>
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo-mono-white.svg">
          </q-avatar>
          <div>Title</div>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>

  </q-layout>
 
    </div>

    <!-- Add the following at the end of your body tag -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/quasar@2.17.0/dist/quasar.umd.prod.js"></script>
    
    <script>
      const { createApp, ref } = Vue;
      const { useQuasar } = Quasar;

      const app = createApp({
        setup () {
          const $q = useQuasar();
          const email = ref(null);
          const leftDrawerOpen = ref(false);
          return {
            email,
            leftDrawerOpen,
            toggleLeftDrawer () {
              leftDrawerOpen.value = !leftDrawerOpen.value;
            },
            onSubmit () {
        
          $q.notify({
            color: 'green-4',
            textColor: 'white',
            icon: 'cloud_done',
            message: 'Submitted'
          });
      },

      onReset () {
        email.value = null;
      }
          };        
        }
      });

      app.use(Quasar);
      app.mount('#q-app');
    </script>
  </body>
</html>`;
return html.replace("BODY", hello.say(method + ": " + url.slice(1) + " - " + body));
$function$
;