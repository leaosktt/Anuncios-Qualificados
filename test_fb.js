async function testFb() {
  const res = await fetch('https://graph.facebook.com/v25.0/12345?fields=id&access_token=dummy');
  const data = await res.json();
  console.log('v25.0:', data);
  
  const res2 = await fetch('https://graph.facebook.com/v20.0/12345?fields=id&access_token=dummy');
  const data2 = await res2.json();
  console.log('v20.0:', data2);
}
testFb();
