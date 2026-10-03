// A faithful miniature of the PDF we produce, with made-up parties, so visitors see the
// actual product instead of a stock image.
export function SampleNotice() {
  return (
    <figure className="sample">
      <div className="sample-page" role="img" aria-label="Sample legal notice with fictional names">
        <div className="sample-head">
          <span>LAWMEDY</span>
          <span>Legal notice<br />MAT-2026-000123</span>
        </div>
        <p className="sample-date">14 October 2026</p>
        <p><b>From:</b> Meera Sharma, 21 Rajpur Road, Dehradun 248001</p>
        <p><b>To:</b> Rakesh Kumar, 5 Market Road, Dehradun 248001</p>
        <p className="sample-subject"><b>Subject:</b> Notice for repayment of ₹2,00,000 lent on 5 March 2026</p>
        <ol>
          <li>You borrowed ₹2,00,000 from my client on 5 March 2026, paid by bank transfer, on the promise to repay by 5 June 2026.</li>
          <li>The due date has passed. No part of the amount has been repaid, and calls since June have gone unanswered.</li>
          <li>My client therefore calls on you to pay ₹2,00,000 within 15 days of receiving this notice, failing which she will take legal action at your cost.</li>
        </ol>
        <p className="sample-sign">Reviewed and approved by an advocate</p>
      </div>
      <figcaption>A sample with made-up names. Yours is written from your own confirmed facts.</figcaption>
    </figure>
  );
}
