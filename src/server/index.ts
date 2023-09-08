import App from './app';
import Bootstrap from './bootstrap';

const start = async () => {
  const app = new App();
  await Bootstrap.start();
  app.init();
};

try {
  start();
} catch (e) {
  console.log(e);
}
