
// import '@mdi/font/css/materialdesignicons.css';
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import App from './App.vue';

const vuetify = createVuetify({
	theme: {
		defaultTheme: 'light',
		themes: {
			light: {
				colors: {
					primary: '#1976d2', // blue
					secondary: '#90caf9', // light blue
					accent: '#2196f3', // blue accent
					background: '#e3f2fd', // light blue background
					surface: '#ffffff',
					error: '#e53935',
					info: '#29b6f6',
					success: '#43a047',
					warning: '#fbc02d',
				},
			},
		},
	},
});

createApp(App).use(vuetify).mount('#app');
