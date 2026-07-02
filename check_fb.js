async function checkFbApi() {
  const res = await fetch('https://graph.facebook.com/v25.0/123?fields=id');
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
checkFbApi();
