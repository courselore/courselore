# Backlog

## Work in Progress

**Minor Changes**

- https://courselore.org/courses/8537410611/conversations/83
  - Rich-text pasting
    - Context-aware pasting
    - Toggle (similar to Programmer Mode)
    - Preserve indentation
      - Feasible, but undesirable, because it may produce invalid Markdown unless we know in which context you’re pasting, and in other cases the spacing in Markdown doesn’t translate to HTML either
    - Perhaps the default should be plain-text pasting, and the keyboard modifier would be for rich-text pasting
      - Wouldn’t work across browsers, because there’s no reliable way to trigger a rich-text paste
  - Printscreen of code
    - Detect & teach user how to paste code
      - File name
      - Resolution & pixel density
      - Metadata
      - Image manipulation
        - Histogram
        - https://medium.com/carsales-dev/using-image-processing-to-extract-the-perfect-shot-out-of-a-screenshot-60a6295a31c4
        - https://sharp.pixelplumbing.com/
      - Clustering algorithm
        - https://ml5js.org/
        - https://keras.io/
        - https://www.tensorflow.org/
        - https://pytorch.org/
        - https://towardsdatascience.com/how-i-used-machine-learning-to-detect-chat-screenshots-on-my-phone-a46d875b07af
    - OCR
      - Only feasible if errors are **very** rare
      - https://www.npmjs.com/package/tesseract.js
      - https://www.npmjs.com/package/node-tesseract-ocr
      - https://www.codefromscreenshot.com/
      - https://code.pieces.app/blog/how-we-made-our-optical-character-recognition-ocr-code-more-accurate
      - https://code.pieces.app/blog/top-ocr-tools
      - https://www.runtime.dev/
- https://courselore.org/courses/8537410611/conversations/84
  - Add to the `…` menu under a message the option to switch message type, which just activates the existing dropdown
- Don’t present the staff whispers button if the conversation involves only staff members.
- Conversations with myself:
  - Show **yourself** in the list of participants to pick
  - Show **ME** when there’s only you in the conversation

**Learning Tools Interoperability (LTI)**

- Reverse engineer LTI 1.3

  - Make Members request work
  - Review Canvas documentation
  - Review Ltijs
  - Review specifications

  ```
  LAUNCH


  provider:main Receiving request at path: /login +17s
  provider:main Receiving a login request from: http://localhost:8000, clientId: uyUgH2duj9DjluF +1ms
  provider:main Redirecting to platform authentication endpoint +18ms
  provider:main Target Link URI:  https://leafac.courselore.org/ +1ms
  provider:main Login request:  +2ms
  provider:main {
  provider:main   response_type: 'id_token',
  provider:main   response_mode: 'form_post',
  provider:main   id_token_signed_response_alg: 'RS256',
  provider:main   scope: 'openid',
  provider:main   client_id: 'uyUgH2duj9DjluF',
  provider:main   redirect_uri: 'https://leafac.courselore.org/',
  provider:main   login_hint: '3',
  provider:main   nonce: 'ywgxyputrj85ue7gikwjpef0g',
  provider:main   prompt: 'none',
  provider:main   state: 'f9981ff2ffbf5a608cec15223059c39e705a61d846ddf81f2b',
  provider:main   lti_message_hint: '{"cmid":3,"launchid":"ltilaunch2_659633542"}',
  provider:main   lti_deployment_id: '3'
  provider:main } +0ms
  provider:main Receiving request at path: / +1s
  provider:main Path does not match reserved endpoints +0ms
  provider:main Cookies received:  +0ms
  provider:main [Object: null prototype] {
  provider:main   statef9981ff2ffbf5a608cec15223059c39e705a61d846ddf81f2b: 'http://localhost:8000'
  provider:main } +0ms
  provider:main Received idtoken for validation +0ms
  provider:auth Response state: f9981ff2ffbf5a608cec15223059c39e705a61d846ddf81f2b +0ms
  provider:auth Attempting to validate iss claim +0ms
  provider:auth Request Iss claim: http://localhost:8000 +0ms
  provider:auth Response Iss claim: http://localhost:8000 +0ms
  provider:auth Attempting to retrieve registered platform +0ms
  provider:auth Retrieving key from jwk_set +12ms
  provider:auth Converting JWK key to PEM key +638ms
  provider:auth Attempting to verify JWT with the given key +2ms
  provider:auth Token signature verified +5ms
  provider:auth Initiating OIDC aditional validation steps +0ms
  provider:auth Validating if aud (Audience) claim matches the value of the tool's clientId given by the platform +0ms
  provider:auth Aud claim: uyUgH2duj9DjluF +0ms
  provider:auth Checking alg claim. Alg: RS256 +0ms
  provider:auth Max age parameter:  10 +0ms
  provider:auth Checking iat claim to prevent old tokens from being passed. +0ms
  provider:auth Iat claim: 1692283991 +0ms
  provider:auth Exp claim: 1692284051 +0ms
  provider:auth Current_time: 1692283992.047 +1ms
  provider:auth Time passed: 1.0469999313354492 +0ms
  provider:auth Validating nonce +0ms
  provider:auth Nonce: ywgxyputrj85ue7gikwjpef0g +0ms
  provider:auth Tool's clientId: uyUgH2duj9DjluF +0ms
  provider:auth Storing nonce +3ms
  provider:auth Initiating LTI 1.3 core claims validation +8ms
  provider:auth Checking Message type claim +0ms
  provider:auth Checking Target Link Uri claim +0ms
  provider:auth Checking Resource Link Id claim +0ms
  provider:auth Checking LTI Version claim +0ms
  provider:auth Checking Deployment Id claim +0ms
  provider:auth Checking Sub claim +0ms
  provider:auth Checking Roles claim +0ms
  provider:auth Successfully validated token! +673ms
  provider:main Generating ltik +680ms
  provider:main Redirecting to endpoint with ltik +1ms
  provider:main Receiving request at path: / +243ms
  provider:main Path does not match reserved endpoints +0ms
  provider:main Cookies received:  +0ms
  provider:main [Object: null prototype] {
  provider:main   'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D': '3'
  provider:main } +0ms
  provider:main Ltik found +1ms
  provider:main Ltik successfully verified +1ms
  provider:main Attempting to retrieve matching session cookie +0ms
  provider:auth Valid session found +253ms
  provider:main Passing request to next handler +19ms
  provider:main Receiving request at path: /info +6s
  provider:main Path does not match reserved endpoints +0ms
  provider:main Cookies received:  +0ms
  provider:main [Object: null prototype] {
  provider:main   'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D': '3'
  provider:main } +0ms
  provider:main Ltik found +1ms
  provider:main Ltik successfully verified +1ms
  provider:main Attempting to retrieve matching session cookie +0ms
  provider:auth Valid session found +6s
  provider:main Passing request to next handler +14ms

  GET
  /info
  {
    host: 'leafac.courselore.org',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybVVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCIsImNsaWVudElkIjoidXlVZ0gyZHVqOURqbHVGIiwiZGVwbG95bWVudElkIjoiMyIsInBsYXRmb3JtQ29kZSI6Imx0aWFIUjBjRG92TDJ4dlkyRnNhRzl6ZERvNE1EQXdkWGxWWjBneVpIVnFPVVJxYkhWR013JTNEJTNEIiwiY29udGV4dElkIjoiaHR0cCUzQSUyRiUyRmxvY2FsaG9zdCUzQTgwMDB1eVVnSDJkdWo5RGpsdUYzMl8yIiwidXNlciI6IjMiLCJzIjoiZjk5ODFmZjJmZmJmNWE2MDhjZWMxNTIyMzA1OWMzOWU3MDVhNjFkODQ2ZGRmODFmMmIiLCJpYXQiOjE2OTIyODM5OTJ9.ysTjOoqXBxOXG371O4pI9MrNfXP9wmWkDoYmmCOzRn8',
    cookie: 'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D=s%3A3.F6GcX%2F9D1%2BCkavbRXVD5pHt6RWRLMwpQjqyO9WqaGiE',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-forwarded-for': '89.181.211.102',
    'x-forwarded-host': 'leafac.courselore.org',
    'x-forwarded-proto': 'https'
  }
  {}



  * * *


  MEMBERS

  provider:main Receiving request at path: /namesandroles +40s
  provider:main Path does not match reserved endpoints +0ms
  provider:main Cookies received:  +0ms
  provider:main [Object: null prototype] {
  provider:main   'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D': '3'
  provider:main } +0ms
  provider:main Ltik found +3ms
  provider:main Ltik successfully verified +8ms
  provider:main Attempting to retrieve matching session cookie +0ms
  provider:auth Valid session found +0ms
  provider:main Passing request to next handler +13ms

  GET
  /namesandroles?ltik=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybVVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCIsImNsaWVudElkIjoidXlVZ0gyZHVqOURqbHVGIiwiZGVwbG95bWVudElkIjoiMyIsInBsYXRmb3JtQ29kZSI6Imx0aWFIUjBjRG92TDJ4dlkyRnNhRzl6ZERvNE1EQXdkWGxWWjBneVpIVnFPVVJxYkhWR013JTNEJTNEIiwiY29udGV4dElkIjoiaHR0cCUzQSUyRiUyRmxvY2FsaG9zdCUzQTgwMDB1eVVnSDJkdWo5RGpsdUYzMl8yIiwidXNlciI6IjMiLCJzIjoiZjk5ODFmZjJmZmJmNWE2MDhjZWMxNTIyMzA1OWMzOWU3MDVhNjFkODQ2ZGRmODFmMmIiLCJpYXQiOjE2OTIyODM5OTJ9.ysTjOoqXBxOXG371O4pI9MrNfXP9wmWkDoYmmCOzRn8
  {
    host: 'leafac.courselore.org',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
    cookie: 'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D=s%3A3.F6GcX%2F9D1%2BCkavbRXVD5pHt6RWRLMwpQjqyO9WqaGiE',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'x-forwarded-for': '89.181.211.102',
    'x-forwarded-host': 'leafac.courselore.org',
    'x-forwarded-proto': 'https'
  }
  {}

  provider:main Receiving request at path: /members +3s
  provider:main Path does not match reserved endpoints +0ms
  provider:main Cookies received:  +0ms
  provider:main [Object: null prototype] {
  provider:main   'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D': '3'
  provider:main } +0ms
  provider:main Ltik found +0ms
  provider:main Ltik successfully verified +1ms
  provider:main Attempting to retrieve matching session cookie +0ms
  provider:auth Valid session found +3s
  provider:main Passing request to next handler +10ms

  GET
  /members
  {
    host: 'leafac.courselore.org',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybVVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCIsImNsaWVudElkIjoidXlVZ0gyZHVqOURqbHVGIiwiZGVwbG95bWVudElkIjoiMyIsInBsYXRmb3JtQ29kZSI6Imx0aWFIUjBjRG92TDJ4dlkyRnNhRzl6ZERvNE1EQXdkWGxWWjBneVpIVnFPVVJxYkhWR013JTNEJTNEIiwiY29udGV4dElkIjoiaHR0cCUzQSUyRiUyRmxvY2FsaG9zdCUzQTgwMDB1eVVnSDJkdWo5RGpsdUYzMl8yIiwidXNlciI6IjMiLCJzIjoiZjk5ODFmZjJmZmJmNWE2MDhjZWMxNTIyMzA1OWMzOWU3MDVhNjFkODQ2ZGRmODFmMmIiLCJpYXQiOjE2OTIyODM5OTJ9.ysTjOoqXBxOXG371O4pI9MrNfXP9wmWkDoYmmCOzRn8',
    cookie: 'ltiaHR0cDovL2xvY2FsaG9zdDo4MDAwdXlVZ0gyZHVqOURqbHVGMw%3D%3D=s%3A3.F6GcX%2F9D1%2BCkavbRXVD5pHt6RWRLMwpQjqyO9WqaGiE',
    'if-none-match': 'W/"a4-uPmO4u5EBiWrD1C15NWrVb4i05U"',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-forwarded-for': '89.181.211.102',
    'x-forwarded-host': 'leafac.courselore.org',
    'x-forwarded-proto': 'https'
  }
  {}

  provider:namesAndRolesService Attempting to retrieve memberships +0ms
  provider:namesAndRolesService Target platform: http://localhost:8000 +0ms
  provider:namesAndRolesService Attempting to retrieve platform access_token for [http://localhost:8000] +7ms
  provider:platform Valid access_token for http://localhost:8000 not found +0ms
  provider:platform Attempting to generate new access_token for http://localhost:8000 +0ms
  provider:platform With scopes: https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly +0ms
  provider:auth Awaiting return from the platform +0ms
  provider:auth Successfully generated new access_token +3s
  provider:namesAndRolesService Access_token retrieved for [http://localhost:8000] +3s
  provider:namesAndRolesService Member pages found:  1 +0ms
  provider:namesAndRolesService Current member page:  http://localhost:8000/mod/lti/services.php/CourseSection/2/bindings/3/memberships +0ms
  provider:namesAndRolesService Memberships retrieved +637ms
  ```

- Ask Hopkins permission.
- Play with Canvas

  - https://canvas.instructure.com/doc/api/index.html
  - Create users
  - Create course
  - Create keys
  - API

    ```
    yaFC0ioOnwa0mVDDxtSNqxI5oi1nDRnojoY7tO1TlgsLK5lR3rSmGeaWJwdvOSit

    curl -H "Authorization: Bearer yaFC0ioOnwa0mVDDxtSNqxI5oi1nDRnojoY7tO1TlgsLK5lR3rSmGeaWJwdvOSit" "http://canvas.docker/api/v1/courses"

    curl http://canvas.docker/api/graphql \
    -H 'Authorization: Bearer yaFC0ioOnwa0mVDDxtSNqxI5oi1nDRnojoY7tO1TlgsLK5lR3rSmGeaWJwdvOSit' \
    -d query='query courseInfo($courseId: ID!) {
        course(id: $courseId) {
          id
          _id
          name
        }
      }' \
    -d variables[courseId]=1

    curl 'http://canvas.docker/api/v1/users/self/activity_stream?as_user_id=sis_user_id:brian' \
     -H "Authorization: Bearer yaFC0ioOnwa0mVDDxtSNqxI5oi1nDRnojoY7tO1TlgsLK5lR3rSmGeaWJwdvOSit"


    API KEY
    10000000000002
    C0TNw2wywTIkPkzZUMCqM8B5ubRdJyWxcMjuJweS1CIjhPxJ6DWdRTSEPNBqEj5o

    http://canvas.docker/login/oauth2/auth?client_id=10000000000002&response_type=code&state=example-of-state&redirect_uri=http://127.0.0.1:3000/redirect-uri
    http://127.0.0.1:3000/redirect-uri?code=23e2515bf8a07346a830db5f5cc55206a7a9bb9908a10cf82715c4b93a7846b91dc8e4b86ef8ec0542bbdfbce0c9708f479531f9812442806e15d2767a9dabac&state=example-of-state
    curl -X POST -d "grant_type=authorization_code&client_id=10000000000002&client_secret=C0TNw2wywTIkPkzZUMCqM8B5ubRdJyWxcMjuJweS1CIjhPxJ6DWdRTSEPNBqEj5o&redirect_uri=http://127.0.0.1:3000/redirect-uri&code=23e2515bf8a07346a830db5f5cc55206a7a9bb9908a10cf82715c4b93a7846b91dc8e4b86ef8ec0542bbdfbce0c9708f479531f9812442806e15d2767a9dabac" http://canvas.docker/login/oauth2/token
    {"access_token":"lXldRcsdjhYKYoKuhlQ5SgrSSEnXazQxG80JPBelQbzqhmfsJhLg4o3f2XR3rbE4","token_type":"Bearer","user":{"id":1,"name":"administrator@courselore.org","global_id":"10000000000001","effective_locale":"en"},"canvas_region":"unknown","refresh_token":"tCbFW0MrSDU95aX9gwKMHMRkiTNKSB5sVsavXljIvrvIiRTGCoUYgNlnpeuGl7bG","expires_in":3600}
    curl -H "Authorization: Bearer lXldRcsdjhYKYoKuhlQ5SgrSSEnXazQxG80JPBelQbzqhmfsJhLg4o3f2XR3rbE4" "https://canvas.instructure.com/api/v1/courses"
    ```

- Decide once and for all:
  - Which version of LTI to use: 1.1 or 1.3
    - 1.3 is officially supported, while 1.1 is deprecated
    - 1.3 is the only one supported by newer tools like Gradescope
    - 1.3 has Ltijs
    - **1.1 doesn’t require intervention from LMS administrators?**
    - **1.1 seems simpler to implement?**
    - **1.3 allows you to get the whole roster at once while 1.1 depends on people entering Courselore at least once?**
  - Use Ltijs (reimplement the database layer) or do it by hand (reimplement a lot of OAuth, OpenID, etc.)
- OAuth
  - Include `state` on authorization request:
    - Redirect URL for when we’re back from authorization flow (deep link)
    - CSRF: Random value stored in session and checked on callback
  - Include PKCE
- SAML
  - Include random value in `RelayState` to prevent CSRF?
- SAML vs OAuth for authentication
  - It is possible that they give you different identifiers for the same person 🤦‍♂️
  - Introduce the notion of multiple emails per account
  - Introduce a way to merge accounts
  - Splash screen prompting to merge accounts
- How the synchronization of course participants behaves:
  - If someone appears in the LMS, sign them up in Courselore and add them as course participant. Mark their participation as having come from the LMS.
  - In general, mark everyone who appears in the LMS.
  - If someone disappears from the LMS, and they have been marked as appearing in LMS in the first place, then it’s okay to remove them.
  - What if the user removes themselves?
- Deep linking for people to put an LMS entry with a link to a specific conversation?
- Perhaps replace our own authentication with OAuth?
  - And what about our future API?
- Document how to use in different LMSs
- Document how developers should install Canvas & Moodle for testing LTI
- Add support for sign-in/sign-up with OAuth?
- References
  - Specifications
    - https://www.imsglobal.org/spec/security/v1p0/
    - https://www.imsglobal.org/spec/lti/v1p3/
    - https://www.imsglobal.org/spec/lti/v1p3/impl/
    - https://www.imsglobal.org/spec/lti-nrps/v2p0/
    - https://www.imsglobal.org/oneroster-v11-final-specification
  - Information
    - https://en.wikipedia.org/wiki/Learning_Tools_Interoperability
    - https://www.imsglobal.org/activity/learning-tools-interoperability
    - https://www.imsglobal.org/lti-advantage-overview
    - https://www.imsglobal.org/lti-adoption-roadmap
    - https://www.imsglobal.org/1edtech-security-framework
    - https://www.imsglobal.org/spec/lti/v1p3/
    - https://elearningindustry.com/learning-tool-interoperability-part-elearning-application
    - http://www.dr-chuck.com/csev-blog/2012/03/connecting-ims-learning-tools-interoperability-and-saml/
    - https://www.edu-apps.org/code.html
    - https://canvas.instructure.com/courses/785215/pages/introduction-to-lti-apps?module_item_id=4761747
    - https://oauth.net
    - https://fusionauth.io/articles/oauth/modern-guide-to-oauth
    - https://drops.dagstuhl.de/opus/volltexte/2022/16616/pdf/OASIcs-ICPEC-2022-12.pdf
    - https://auth0.com/docs/secure/tokens/json-web-tokens
    - https://workos.com/blog/the-developers-guide-to-sso
    - https://workos.com/blog/fun-with-saml-sso-vulnerabilities-and-footguns
    - https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc
    - https://www.azureblue.io/oauth2-openid-connect-in-a-nutshell-part-1/
    - https://www.youtube.com/watch?v=996OiexHze0
    - https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/
    - https://oauth.net/2/
    - https://www.oauth.com
    - https://www.passportjs.org/concepts/oauth2/
    - https://www.youtube.com/watch?v=Llk-t8sN3zo
      - https://community.canvaslms.com/t5/Canvas-Developers-Group/Any-recommendations-for-Java-based-LTI-1-3-libraries/td-p/419568
    - https://medium.com/voxy-engineering/introduction-to-lti-1-3-270f17505d75
    - https://docs.anthology.com/docs/LTI/Tutorials/lti-lti_impl_guide
    - https://github.com/1EdTech/ltibootcamp
    - https://github.com/blackboard/BBDN-LTI-Tool-Provider-Node/tree/master
    - https://learn.microsoft.com/en-us/linkedin/learning/sso-auth/sso-docs/lti-13-implementation
    - https://moodle.org/mod/forum/discuss.php?d=430016
  - OneRoster
    - https://www.imsglobal.org/oneroster-11-introduction
    - https://www.imsglobal.org/activity/onerosterlis
  - Implementations
    - LTI
      - https://cvmcosta.me/ltijs/
        - https://github.com/Cvmcosta/ltijs-demo-server
        - https://github.com/Cvmcosta/ltijs-demo-client
      - https://github.com/blackboard/BBDN-LTI-Tool-Provider-Node
      - https://github.com/SanDiegoCodeSchool/lti-node-example
      - https://github.com/oat-sa/devkit-lti1p3
      - https://github.com/UOC/java-lti-1.3-provider-example
    - OAuth2
      - Lists
        - https://oauth.net/code/nodejs/
      - Testing server
        - https://github.com/axa-group/oauth2-mock-server
        - https://github.com/dexidp/dex (Go)
        - https://github.com/navikt/mock-oauth2-server (Java)
      - Client
        - https://npmtrends.com/@badgateway/oauth2-client-vs-oauth-vs-oauth4webapi-vs-openid-client
        - https://github.com/panva/node-openid-client
        - https://github.com/ciaranj/node-oauth
        - https://github.com/panva/oauth4webapi (a version of https://github.com/panva/node-openid-client that works in JavaScript environments other than Node.js)
        - https://github.com/badgateway/oauth2-client
        - https://github.com/authts/oidc-client-ts (for the browser only)
      - Server
        - https://npmtrends.com/@node-oauth/oauth2-server-vs-oidc-provider
        - https://github.com/panva/node-oidc-provider
        - https://github.com/node-oauth/express-oauth-server
          - https://github.com/node-oauth/node-oauth2-server
    - JWT
      - https://github.com/auth0/node-jsonwebtoken
      - https://github.com/panva/jose
  - Tools
    - https://www.oauth.com/oauth2-servers/tools-and-libraries/
    - https://lti.tools/saltire/
  - Service Consumers (LMSs) to test with
    - https://demo.moodle.net
    - https://lti-ri.imsglobal.org
    - https://github.com/instructure/canvas-lms
    - https://github.com/moodle/moodle
    - https://github.com/sakaiproject/sakai
  - Example of connecting Moodle & Piazza
    - https://support.piazza.com/support/solutions/articles/48001065448-configure-piazza-within-moodle
    - https://demo.moodle.net
  - Existing services
    - https://help.gradescope.com/category/kiu9t7kmdt-administrator
    - https://support.piazza.com/support/solutions/folders/48000669350
      - https://piazza.com/product/lti
    - https://github.com/microsoftarchive/Learn-LTI/blob/main/docs/CONFIGURATION_GUIDE.md
    - https://docs.moodle.org/402/en/LTI_and_Moodle
    - https://mlm.pearson.com/global/educators/support/lms-integration-services/index.html
    - https://kb.wisc.edu/luwmad/page.php?id=123560
  - https://courselore.org/courses/8537410611/conversations/79
- Later
  - Perhaps integrate at the application level and create courses automatically
  - Allow staff members to control the process of synchronizing course participants in more detail, for example, have some options to quarantine instead of removing. (Some people may not trust the registrar 100%)
  - Certification:
    - https://www.imsglobal.org/lti-advantage-certification-suite
    - https://site.imsglobal.org/certifications
    - https://www.1edtech.org/certification/get-certified
  - Promote:
    - Pamphlet about Courselore at Hopkins: Mike Reese
    - https://www.eduappcenter.com
- Notes
  - JWT libraries
    - Features
      - Create & verify tokens
      - Create keys
      - Manage keysets
      - Decode tokens without verification (for convenience)
    - Candidates (https://jwt.io/libraries)
      - https://github.com/panva/jose
        - Doesn’t have a utility to create JWKS endpoints
          - https://github.com/panva/jose/discussions/486#discussioncomment-4376721
          - https://github.com/panva/jose/discussions/135#discussioncomment-243837
      - https://github.com/auth0/node-jsonwebtoken & https://github.com/auth0/node-jwks-rsa
        - Most popular
        - Doesn’t create keys
        - A bit more convenient interface
        - Relies on `@types/`
- Implementation snippets

  - `host.docker.internal`
  - `docker run --rm -it ubuntu bash`
  - `docker run --rm -it alpine sh`

  - GitHub client

    ```
    {
      "scripts": {
        "start": "nodemon --watch \"./index.mjs\" --ext \"*\" --exec \"node ./index.mjs\""
      },
      "dependencies": {
        "express": "^4.18.2",
        "got": "^13.0.0",
        "qs": "^6.11.2"
      },
      "devDependencies": {
        "nodemon": "^2.0.22"
      }
    }


    import express from "express";
    import qs from "qs";
    import got from "got";

    const clientId = "___";
    const clientSecret = "___";

    let accessToken;

    const application = express();

    application.get("/", async (request, response) => {
      if (typeof accessToken !== "string")
        return response.redirect(
          `https://github.com/login/oauth/authorize${qs.stringify(
            {
              scope: "read:user",
              client_id: clientId,
            },
            {
              addQueryPrefix: true,
            }
          )}`
        );

      const githubResponse = await got
        .get("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .json();
      console.log(githubResponse);
      response.end();
    });

    application.get("/callback", async (request, response) => {
      console.log(request.query);
      const githubResponse = await got
        .post("https://github.com/login/oauth/access_token", {
          form: {
            client_id: clientId,
            client_secret: clientSecret,
            code: request.query.code,
            accept: "json",
          },
        })
        .json();
      console.log(githubResponse);
      accessToken = githubResponse.access_token;
      response.redirect("/");
    });

    application.listen(3000);
    ```

  - OAuth2 client

    ```
    {
      "scripts": {
        "start:server": "oauth2-mock-server",
        "start:client": "nodemon --watch \"./index.mjs\" --ext \"*\" --exec \"node ./index.mjs\""
      },
      "dependencies": {
        "express": "^4.18.2",
        "got": "^13.0.0",
        "oauth2-mock-server": "^6.0.0",
        "qs": "^6.11.2"
      },
      "devDependencies": {
        "nodemon": "^2.0.22"
      }
    }

    import express from "express";
    import qs from "qs";
    import got from "got";

    // $ curl -X POST -d "client_id=example-oauth-client&client_secret=password&grant_type=client_credentials" "http://localhost:8080/token"

    const application = express();

    let token;

    application.get("/", (request, response) => {
      if (token === undefined)
        return response.redirect(
          `http://localhost:8080/authorize${qs.stringify(
            {
              client_id: "example-oauth-client",
              response_type: "code",
              scope: "openid",
              redirect_uri: "http://localhost:3000/callback",
            },
            { addQueryPrefix: true }
          )}`
        );

      console.log(token);
      response.end();
    });

    application.get("/callback", async (request, response) => {
      console.log(request.query);
      token = await got
        .post("http://localhost:8080/token", {
          form: {
            client_id: "example-oauth-client",
            client_secret: "password",
            grant_type: "authorization_code",
            code: request.query.code,
          },
        })
        .json();
      response.redirect("/");
    });

    application.get("/refresh", async (request, response) => {
      token = await got
        .post("http://localhost:8080/token", {
          form: {
            client_id: "example-oauth-client",
            client_secret: "password",
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
          },
        })
        .json();
      response.redirect("/");
    });

    application.listen(3000);
    ```

  - OpenID Connect client
  - LTI

    ```

    // https://loose-dolls-beg.loca.lt/register
    dynReg: {
      url: 'https://loose-dolls-beg.loca.lt', // Tool Provider URL. Required field.
      name: 'Example of Ltijs', // Tool Provider name. Required field.
      logo: 'https://leafac.com/avatar.webp', // Tool Provider logo URL.
      description: 'Example Tool Description', // Tool Provider description.
      autoActivate: true // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
    }


    // MOODLE
    await lti.registerPlatform({
      url: 'http://localhost:8000',
      name: 'Example of Platform MOODLE',
      clientId: 'gIrpGGmztzpiBhF',
      authenticationEndpoint: 'http://localhost:8000/mod/lti/auth.php',
      accesstokenEndpoint: 'http://localhost:8000/mod/lti/token.php',
      authConfig: { method: 'JWK_SET', key: 'http://localhost:8000/mod/lti/certs.php' }
    })

    // CANVAS
    await lti.registerPlatform({
      url: 'https://canvas.instructure.com',
      name: 'Example of Platform CANVAS',
      clientId: '10000000000003',
      authenticationEndpoint: 'http://canvas.docker/api/lti/authorize_redirect',
      accesstokenEndpoint: 'http://canvas.docker/login/oauth2/token',
      authConfig: { method: 'JWK_SET', key: 'http://canvas.docker/api/lti/security/jwks' }
    })
    ```

**AI**

- Hit API for AI service
  - Make it distinguished
    - Sidebar like “Follow-up Question”
  - AI generated, might be wrong
  - Send question / receive answer
- Train database
- Just for Ali’s course
- If there’s an image or a poll in message, don’t hit API.
- Feedback system
  - The AI-generated answer “resolved” the question
  - Have a button to “resolve”
  - Later, the API will provide a “thumbs-up/thumbs-down” endpoint as well

**Other**

- UI on the upper left
- Feature branches
  - `poll`
    - Exam period
    - Files
      - `authentication.ts`
      - `content.ts`
      - `conversation.ts`
      - `course.ts`
      - `database.ts`
      - `index.ts`
      - `layouts.ts`
      - `message.ts`
      - `user.ts`
  - `app-mobile`
- Email notification digests
- Conversation drafts
- Pagination

## Authentication

**SAML**

- Security
  - Prevent replay attacks by storing assertion IDs that have already been seen (and purge them when `NotOnOrAfter` has passed)
  - Does the library we use validate the XML and the signature?
- Infrastructure
  - Add support for `HTTP-POST` in addition to `HTTP-Redirect`
  - Single logout back channel (synchronous) (SOAP) (server-to-server from identity provider to service provider)
- NameID
  - Right now we have sort of a hack to allow for NameIDs which are emails that don’t have inboxes associated with them: we look at another attribute for the email and ignore the NameID. Strictly speaking, people could change these addresses and impersonate one another. In practice, this isn’t a big deal: They’d be able to impersonate one another anyway using the “Forgot Your Password?” feature. In any case, it’d be more principled to use the NameID and store it separate from the email address in which you receive email.
  - Add support for other `nameIDFormat`s
    - Store in `users` table: `samlIdentifier`, `nameIDFormat`, and `nameID`
    - Double-check whether we need something at the `sessions` table.
    - Dealing with transient `nameID`s is tricky
    - Review code in `authentication.mts`
  - Add support for `emailAdress`es that doesn’t follow our more strict rules for email address format
- Interface
  - When there are many universities, add a filter to the user interface, similar to Gradescope has, and similar to what we do in the list of course participants.
  - Long SAML identity provider name may break the interface (use ellipsis to fix it?)
- Sign up with SAML if identity provider doesn’t provide a name
  - Create a session without a user, but with an email address instead.
    - It doesn’t have to use a cookie, it can be a short-lived session as a `hidden` field in the form, similar to password reset.
      - `flashes`
        - Yes
      - `sessions`
        - No, because token is long-lived, sliding, and there’s a foreign key to the `user`
      - `passwordResets`
        - No, because there’s a foreign key to the `user` (but the concept o `nonce` is what we want)
      - `emailVerifications`
        - No, because there’s a foreign key to the `user` (but the concept o `nonce` is what we want)
  - Create user interface with form for name (and other data we might want to ask from the user)
  - Create the backend that makes sign up with SAML work.
    - Reuse the existing sign-up route, or create a new one?
  - Make invitation name & email work as well?
  - Grab avatar from SAML assertions.
  - Document in `example.mjs` that `attributes` is optional.
- Changing user information on SAML sign in
  - Passwords
    - Allow user to create a password after the fact
      - Security concern: When creating a password, you can’t verify that you are yourself by typing in your old password.
        - Perhaps just use the password reset workflow, which sends an email instead?
    - Insist on administrators having a password
  - Email
    - Perhaps have a more elegant solution for when you sign in with SAML and try to change your email, which would cause sign out to not work.
      - For the time being we just disallow it.
  - Let the person remove their account that they created via SAML.
- Allow people to disconnect the SAML identity from their account? (As long as they have a password?)
- Have a way for system administrators to turn off sign in via email and password
- Introduce a way for system administrators to clear all sessions for when they need to remove a SAML identity provider
- A user interface for setting up SAML dynamically instead of using the configuration file
- Let the system administrators rotate keys?
  - Create a user interface to let them create keys using Courselore (show private key only once)
  - Create a user interface to let them import keys created elsewhere into Courselore
  - Serve both keys during the transition period
- Internalize other parts of the configuration file and turn them into `administrationOptions`, for example, `email`
- Let people set different keys for different Identity Providers?
- Have some sort of wizard for when you start Courselore for the first time to set things up:
  - Create administrator account
  - Setup these `administrationOptions`

## Users

- Show users their `systemRole`.
- When you change your email, don’t actually change the email until it’s verified. Otherwise an attacker with a compromised password could change your email and lock you out of the “Forgot your password?” flow.
- Allow person to have multiple emails on their account?
- Online indicators.
  - Turn them on as soon as someone who was offline becomes online (right now it may take up to 5 minutes in next periodic Live-Update).
  - Fade in and out.
- Authentication:
  - 2-Factor Authentication.
  - Look into SIS to get a list of courses
- Extra fields:
  - Display name.
  - Pronoun.
  - A short audio with the name’s pronunciation.

## Courses

- Lock a course for a period, for example, when a take-home exam is out.
  - Still allow students to ask private questions
  - Multiple locks, scheduled in advance?
- Groups
  - For example, Graders, Project Advisors, Groups in OOSE, different sections on courses.
  - Some groups are available to everyone, some only to course staff, some only to students
  - Invitations per group.
  - Choose a group:
    - When joining the course
    - When already joined.
  - Manage groups participants
    - Course staff may manage groups participants
    - Course group participants manage themselves?
  - May you be part of more than one group, or no group at all?
  - Conversation Participants should be aware of groups
  - Mentions like `@group-3`.
- Pretty URLs for courses (for example, `https://courselore.org/principles-of-programming-languages--2023`)?
  - https://courselore.org/courses/8537410611/conversations/44
- Have a way to delete a course entirely?
- On tags, `this.isModified = true;` in `this.reorder()` is heavy-handed, because it marks everything as modified even if you reorder back to original order or “recycle” a tag.

## Invitations

- Now that SAML made us change the `password` column into optional in the `users` table in the database, perhaps we could create users and course participants when you “create invitation via email?”
- Simplify the system by having a single invitation link per course role that you can enable/disable/reset.
- Limit invitation links to certain email domains, for example, “this link may only be used by people whose emails end with `@jhu.edu`.”
- Have an option to require the course staff to approve course participants.
- Have a public listing of courses in the system and allow people to request to join?
- When the user signs up via an invitation, have a call to action to fill in profile (just like the one when you sign up without an invitation).
- Allow course staff to preview the email invitations they’re about to submit? (Think the problem with the “enroll” vs “course participant” language.)

## Course Participants

- Have a setting to either let students remove themselves from the course or request the course staff to have them removed.
- Allow the last course staff member to remove themselves from the course? (Might as well, since we put this protection in place to prevent “orphan courses” which no one can manage, but since then we introduced the possibility of removing your account entirely, so orphan courses are a possibility.)
- Upload roster and show differences.
  - https://courselore.org/courses/8537410611/conversations/34

## Conversations

- Have a course setting for the defaults of the “New Conversation” form. For example, in Meta Courselore, it makes sense for new conversations to **not** be announcements, not even for course staff.
- Drafts:
  - Database schema
    - Recreate table
    - Indices
    - Search indices (because search should work over the content of drafts)
  - User interface
    - Unhide buttons
      - Perhaps don’t have them styled as links…
    - Adapt `partials.conversation` to support drafts (many fields become optional).
    - Mix drafts with other conversations on sidebar
      - Group them together
      - Visually distinct (grayed out)
      - Add a button to delete a draft directly from the sidebar.
    - Search
    - Filters
  - Server code
    - Create, edit, and remove conversation draft
  - `TODO`
- Have a simple way to share “conversation starters,” which use the query parameters to pre-fill the “New Conversation” form.
- Add the notion of “course staff considers this a good question.” Similar to the notion of “endorsement,” but for questions.
  - https://courselore.org/courses/8537410611/conversations/33
- Streamline the creation of DMs.
- Highlights (similar to Slack’s pins, but we’re avoiding the word “pin” because it already means “pinned conversations”). The highlights are visible to everyone in the conversation.
- Bookmarks / flags / saved items. These are personal, for example, for something you have to follow up on.
- Assign questions to CAs.
- Different states: Open, locked, archived.
- “Mark all conversations as read” could work with search & filters, marking as read only the conversations that matched the search & filters.
- Let original question asker approve an answer.
- Add a course-wide setting to make tags optional in all kinds of conversation (not only non-chats), even if there are tags.

**Participants**

- Client-side filters like **Course Settings > Course Participants**, **Administration > Users**, Conversation Participants, and so forth:
  - Extract and DRY.
  - Treat more elegantly the case in which the filter removed all entries.
- More elegant treatment of edge cases:
  - You’re the only course staff member
  - You’re the only course participant
  - There are no students
- Consider removing selected participants from `getConversation()` as it’s probably expensive to retrieve and isn’t always necessary.
- Course staff may allow or disallow people to have private conversations in which course staff don’t participate (the default is to allow)

**Chats**

- Have chats on a little sidebar thing, similar to Discourse.

## Messages

- Let course staff endorse other course staff answers.
- Introduce the notion of promoting a message into its own conversation (one example use case is when someone asks a question as a follow-up to an announcement).
- Add a notion of “reply” that’s a first-class citizen, like Discord and unlike GitHub.
  - Nested replies (similar to Slack’s threads).
- Polls
  - Polls don’t render in email notifications, because we’re still sending the content without processing.
  - Include options in full-text search. This is difficult because when you edit a poll we’d have to track every use of the poll and update it as well.
  - Reusing a poll in a new course doesn’t work out of the box; we need some logic to duplicate the poll.
  - Use content editor for poll options? (Think of a poll in which the options are `@mentions`, or LaTeX formulas.)
  - When you’re editing a poll and submit the message, you lose the poll.
  - Have a way to not even show the “Edit Poll” dropdown menu on the content editor when you may not edit a poll.
  - Changes to the inputs related to creating a poll don’t need to submit message draft updates
  - Finer control over who can see what results
  - Ranking: https://civs1.civs.us
- Course staff whispers
  - Talk about course staff whispers on home page.
  - Disclosure button to show/hide whispers
    - On load, it’s showing
    - On new whisper, show again
    - The point is: Don’t let people miss whispers
  - The order or messages on the left now may be different for students and course staff
    - Two `"conversations"."updatedAt"`, one for course staff (which updates on course staff whispers) and one for students (which does not update on course staff whispers)
  - Reference: Discourse

**Readings & Views**

- Change the meaning of “views”: Instead of using “readings”, only count as “viewed” if the message has appeared on the person’s screen.
  - Tracking pixel on email for people who will read the notification on their email and just “mark as read” on Courselore?
- Mark a message as unread.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).
- Add different notification badges for when you’re @mentioned.
  - On badges on sidebar indicating that a conversation includes unread messages
  - On badges on course list
  - https://courselore.org/courses/8537410611/conversations/53
- A timeline-like list of unread messages and other things that require your attention.

**Chat**

- 1-to-1 chats: Use background color to distinguish between people, so you don’t have to show their names over and over.

**Reuse**

- Import messages from Piazza in a structured way.
- Don’t use the URL to reuse a message, like we’re doing now, because there’s a size limit to the URL (for example, the demonstration data of rich text is too big and causes a 431 response). Instead, put course/conversation/message on query parameters and fetch straight from the database on `/new` route.
- Have a way to mark several messages in a course as reusable and reuse them all at the same time on a new course.
  - The reusable messages could become “drafts” in the new course.
- Have a way to schedule messages into the future, to have a timeline of things like homework handouts.
  - Either automatically post, or just notify course staff that it’s time to post (in case they want to double-check stuff)
- Follow up with Jason
  - Ask about other features he thinks may help Courselore stand out from email lists and other communication software.
- Introduce the notion of course resources
  - Superpinned conversation that people can’t post messages to.
- Don’t introduce the notion of continuity between courses as a first-class concept in the application, because it would complicate things too much. Just have ways to “import” material from other courses conveniently.

## Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the course staff has access to the identity.

## Search & Filters

- Search should display multiple messages in the same conversation. (Right now it’s only showing the highest ranked message and grouping by conversation.)
- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filter by date.
- `@mentions` are awkward in search results, because they take in account the original `@<course-participant-reference>--<name-slug>` instead of the rendered person’s name.
- When filtering by “Selected People”, allow you to select **which** people.
- Include tags in freeform search

## Content

**Processor**

- On the `partials.content()`, maybe don’t render `@mention` widget for people who aren’t in the conversation, given that we don’t show that person as an option on the `@mentions` autocomplete widget in the content editor.
- It’s possible to send messages that are visually empty, for example, `<!-- -->`
- `#references` into the same conversation don’t need to load the whole `partials.conversation()`, just the message part of it.
- Lightbox modal:
  - Resized images
  - Code blocks
    - Just truncate and have a “click for more” kind of button
    - Do a proper lightbox modal in full screen
    - Give option to wrap or not long lines
  - Block quotes (especially replies)
  - https://courselore.org/courses/8537410611/conversations/6
- Mermaid: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
  - Isn’t made for server-side rendering: https://github.com/mermaid-js/mermaid/issues/3650
  - The current workaround is to use `mermaid-cli`, which uses Puppeteer, but that’s slow and downloads a whole browser (~200MB) 🤦‍♂️
- Once the chats have been redesigned with avatars on the margin to better establish a hierarchy and delimit messages, consider bringing back the full `partials.user()` widget to `@mentions`, with avatar and everything. (I think this will look good, but it’s a controversial point, given that people were very insistent on removing avatars from that context.)
- Checklists: Make it easy to check/uncheck and move items (like GitHub) (only if you can edit the message).
- Video:
  - Convert to improve compatibility & performance?
  - Poster image for `<video>` tag?
  - How do they show up in email notifications?
- Let the “quote” selected text pick parts of paragraphs.
  - https://courselore.org/courses/8537410611/conversations/63
- When you click on a footnote and hit the “back” browser button, you aren’t taken back to where you were, because we’re hijacking history navigation with Live-Navigation. The same issue probably happens with anchors in messages in general. The solution is probably to keep track of scrolling position in Live-Navigation, or maybe try and find a way to revert back to the default browser behavior in this special case of `window.onpopstate`.

**Editor**

- On new conversation page, maybe adapt the `@mentions` widget according to the participants that are currently set. (This already happens on drafting messages on existing conversations.)
- Have the `@mention` widget list people who aren’t in the conversation (suitably marked as so) (similar to Twitter DMs).
- Answer templates.
- Add https://github.com/fregante/indent-textarea or CodeMirror in programmer mode.
  - Issue with indent-textarea is that it only supports tabs, not spaces https://github.com/fregante/indent-textarea/issues/21
  - CodeMirror is heavy-handed
- If you’re in the middle of editing, and someone else edits a message (or the conversation title), then you’re going to overwrite their changes. Warn about this.
- In programmer mode, change the behavior of when the `@mentions` and `#references` widgets appear and go away, particularly in code & mathematics blocks. (Not even GitHub is that smart)
- Load “Preview” on hover/focus to speed things up?
- Rich-text paste
  - Mobile
    - Rich-text pasting is flaky. For the time being it’s just turned off
    - There’s no way to force a plain-text pasting: Perhaps do a toggle, just like Programmer Mode, for rich-text pasting?
  - Bundle size got bigger:
    - Do it on the server?
    - Split this dependency into a separate file that’s loaded later?
  - Better mathematics, if that’s even possible
    - We support KaTeX’s `annotation` tags and Wikipedia’s images, but not much else, because the source material doesn’t give us enough to go by.
      - We tried doing MathML → LaTeX, but the MathML in the clipboard material includes `�` in place of some characters
      - Oddly enough, the `annotation` tag sometimes seems to show up in the clipboard (https://katex.org/), and sometimes it doesn’t (https://cs226sp23.github.io/notes/10-asymptotics/step05.html), even though it’s in the DOM 🤷‍♂️
    - Examples
      - https://katex.org/
      - https://www.mathjax.org/
      - https://en.wikipedia.org/wiki/Big_O_notation
      - https://cs226sp23.github.io/notes/10-asymptotics/step05.html
  - @github/paste-markdown: More sophisticated in mixing rich-text with pain-text without resorting to different pasting modalities, but more limited in the kind of rich-text that’s supported.

## Notifications

**Email**

- Grace period between sending a message and triggering the email notifications
  - Allow users to configure it? (It’s difficult because it’d have to become a per-user setting, while now it’s one setting for the entire system)
  - The feature is effectively turned off with a grace period of zero
  - https://courselore.org/courses/8537410611/conversations/28
- Allow replying to a message by replying to the email notification
  - Obfuscate email addresses in the message (like GitHub does).
  - Have an SMTP server to receive messages directly, or consume an inbox with IMAP/POP?
  - There’s nothing we can do about replying to an email notifications digest, so it should still go to the system administrator, or perhaps have an automatic bounce reply 🤷‍♂️
- Don’t send notifications when the person is online and/or has seen the message.
  - Explain this in Notifications Settings page.
- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
- Add option to receive email notifications for your own messages.
- Email digests:
  - “Announcements” should be sent immediately, not as part of the digest.
  - What happens when you change your email notification settings and a digest is already being prepared for you?
  - When it’s time to process a message:
    - Process content with recipients perspective
      - Extract out of `application.web` (Right now we make up fake request/response objects, which is prone to errors.)
        - Are there other auxiliary functions that need to be extracted like that?
      - Modify content processor to allow for taking an arbitrary user’s perspective
    - If digest: enqueue in digests queue
  - Periodically check digests queue and enqueue `sendEmailJobs` for delivery
    - Enqueue hourly digests on the hour and daily digests at 07:00 UTC.
  - Digests should use `contentSearch` truncated?
  - Digests group messages from different courses?
  - `notificationDigestJobs`
    - Existence indicates active worker to avoid race condition
    - `startedAt` is used for timeout
  - Reenable digests in user interface
  - Add transaction to `emailNotificationMessageJobs`
  - https://courselore.org/courses/8537410611/conversations/22
- Email contents:

  - Subjects could include the fact that you were mentioned, to make it easier to set up filters.
    - Perhaps this could be more generalized and, like GitHub, include the reason why you were notified. (GitHub seems to do that with a custom header.)
  - Easier ways to unsubscribe:
    - Link to one-click unsubscription in message body.
    - `List-*` headers to allow one-click unsubscription.
    - Don’t require user to be logged in to unsubscribe from notifications?
  - Decorate (with some special treatment for email notifications):
    - Avoid showing things like `@john-doe--201231`.
    - Code blocks are duplicated:
      - Have a processor to remove one of the versions of code block from the email.
    - Polls don’t show up
  - Mathematics are rendered incorrectly.
  - https://courselore.org/courses/8537410611/conversations/7
  - Add first-class support for Dark Mode in emails? Or continue relying on automatic Dark Mode? And, in general, style our emails more?

    ```html
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />

    <style type="text/css">
      :root {
        color-scheme: light dark;
        supported-color-schemes: light dark;
      }
    </style>

    <style>
      /* Normal styles */
      @media (prefers-color-scheme: dark) {
        /* Dark mode styles */
      }
    </style>

    <style>
      .dark {
        display: none !important;
      }
      @media (prefers-color-scheme: dark) {
        .light {
          display: none !important;
        }
        .dark {
          display: block !important;
        }
      }
    </style>
    ```

**Other**

- Browser Notifications API & Push API; Desktop & phone applications.

```javascript
Notification.requestPermission();
Notification.permission;
new Notification('Example');

<button
  class="button button--transparent"
  javascript="${javascript`
    this.onclick = async () => {
      if (await Notification.requestPermission() === "denied") return;
      new Notification("Example");
    };
  `}"
>
  <i class="bi bi-bell"></i>
  Send Notification
</button>
```

## User Interface Improvements

**Top Menus**

- Use hamburger menu instead of a couple separate menus
  - It shouldn’t cover the whole page underneath (and shouldn’t push an entry into the history, naturally)

**Sidebar · Actions**

- Clean interface.
- Don’t have an “Apply Filter” button, but apply the filters as soon as you click on them.
- Search as you type.
- New filters (and quick filters):
  - Conversations I started
  - My questions
  - Conversations in which I participated.
  - Conversations in which I’m mentioned
    - https://courselore.org/courses/8537410611/conversations/65
- Use a dropdown to occupy less space

**Sidebar · Conversations List**

- Group conversations (similar to Piazza & Campuswire).
  - Includes unread messages
  - Date
  - Pinned
  - Tags
  - Type
- Conversations that are pinned & read may be collapsed after some time, but pinned & unread must be shown prominently.
- Conversations are sorted by most recent activity, but that means when you send a message, the conversation moves to the top, which can be disorienting.
  - Wait for a little while, 10~30 minutes, before sorting.
- Make the distinction between the types more prominent. Separate questions from chats in the list of conversations, for example.
  - Make the visualization of “types” a little more distinct, for example, make announcements pop up.
  - Improve display of endorsements & answers (on the sidebar, include number of answers).
  - Manage answer badges more intelligently (answered at all, answered by course staff).
- Quick Actions:
  - Unpin
  - Resolve a Question.

**Conversation**

- Add “Change conversation type” and that sort of thing to the “Actions” menu?
- Editing tags should behave like “Selected Participants” (save on dropdown close, and so forth)
- Fix keyboard navigation on “Selected Participants” widget, which is a bunch of checkboxes acting as a `<select>`.
- When navigating between conversations, preserve scrolling position
  - https://courselore.org/courses/8537410611/conversations/66
- Introduce panes so you can have multiple conversations open on the same window, side-by-side (particularly useful on desktop application, maybe even on mobile application).

**Messages**

- Higher contrast between background and text?
- Blockquotes
  - Faint background color to help differentiate them?
  - Collapse long blockquotes?
- Add more options to the hover menu (besides the ellipses), similar to Slack & Discord.
- Bigger font (15pt).
- Wider columns
- Include a “set as answer and endorse” button.
- Don’t show endorsements for messages that have been converted into non-answers. (They show up at least for course staff.)
- Course staff endorsements should show a list of people similar to “Likes” and “Views”.
- `position: sticky` headers (showing author name, and so forth)

**Chat**

- Move the avatar to the side, giving a clearer indication of where a message ends and another one starts
- More space between messages?
- Collapse long messages.
- Add a button to “Return to Bottom” when chat is scrolled up.
- Scrolling is glitchy:

  - Images may break the scrolling to the bottom.
  - Safari/Firefox window resize causes unwanted scrolling.
  - Possible solutions:

    - Mutation Observer & more JavaScript 🤷

    - Wrapper with `flex-direction: column-reverse;` (<https://stackoverflow.com/a/72644230>)

      - Safari desktop: Content scrolls if you’re up
      - Safari iOS: Content isn’t pinned to the bottom if you scroll up and back down

      ```html
      <div
        style="
            background-color: cyan;
            height: 200px;
            overflow: auto;
            display: flex;
            flex-direction: column-reverse;
          "
      >
        <div key="content"></div>
      </div>
      <button
        onclick='document.querySelector(`[key="content"]`).insertAdjacentHTML("beforeend", `<p style="background-color: green;">${new Date().toISOString()}</p>`)'
      >
        Add
      </button>
      ```

    - `overflow-anchor` (<https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom/>)

      - Doesn’t work in Safari at all 🤦‍♂️

      ```html
      <div style="background-color: cyan; height: 200px; overflow: auto">
        <div key="anchor" style="overflow-anchor: auto; height: 1px;"></div>
      </div>
      <button
        onclick='document.querySelector(`[key="anchor"]`).insertAdjacentHTML("beforebegin", `<p style="background-color: green; overflow-anchor: none;">${new Date().toISOString()}</p>`)'
      >
        Add
      </button>
      ```

**Content Editor**

- Help page
  - Clarify that “Programmer Mode” is for your input only. Unlike other buttons on the toolbar, it doesn’t affect the rendered text.
- When editing, and trying to send empty message, propose to delete (like Discord does).
- When pressing `↑` on an empty chat box, start editing the your most recently sent message (if it’s still the most recently sent message in the conversation) (like Discord does).
- Issue with autosizing:
  - Slows down the typing in iOS
    - https://courselore.org/courses/8537410611/conversations/66
  - In chats, if the textarea is autosizing, then the main messages pane scrolls up.
  - When you’re typing, there’s a weird scrollbar glitch: it shows up for a split second and hides back again. I observed this in Meta Courselore using Safari.
  - Leaks resources because of the global `Map` of bound textareas. It should be using `WeakMap` instead.
  - Also slows down “Reply” of long messages, like the rich-text demonstration message.
  - https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
  - https://github.com/fregante/fit-textarea **Use v2**.
  - https://courselore.org/courses/8537410611/conversations/66
- Selecting multiple paragraphs and bolding doesn’t work (the same issue occurs in GitHub 🤷)
- Don’t let `@metions` and `#references` widgets appear if you’re in the middle of a code block.
  - https://courselore.org/courses/8537410611/conversations/64

**New Conversation**

- Keep all the material that is there, but present it differently to try and make the page cleaner.
- Collapse tags (similar to what we do in the conversation page itself, and to what Reddit does).
  - Change the widget that’s a tag: Instead of `icon text`, make the text look like it’s inside a tag.
- Use different background colors, similar to Piazza.

**Live-Navigation**

- On form submissions, for example, when you create an invitation, highlight the part of the page that changed (use the same yellow we use for permanent links to messages).

**Other**

- Add the number of unread messages to the `<title>`.
  - Or change the favicon.
  - https://courselore.org/courses/8537410611/conversations/25
- Detect old or otherwise unsupported browsers and alert, asking the user to update.
- Make breadcrumbs (for example, under “User Settings”) clickable (they should expose the navigation menu, just like what happens in Visual Studio Code).
- The anonymity button isn’t as clear as it should be.
- Add more help pages in other parts that may need them.
- Replace `<i class="bi bi-info-circle"></i>` with `<i class="bi bi-question-circle"></i>`?
- Flash:
  - Anchor it to artificial element, instead of `<body>` hack
  - When there are multiple (for example, you’ve just edited your profile **and** you become offline), let them stack on top of each other, instead of overlapping.
- Consider using `position: absolute` for header and footer, to avoid them scrolling under any circumstance
  - Also, you could probably scroll anywhere on the page, as opposed to now, when you must have your cursor in the scrolling pane.
- On lists with reorderable items, scroll when your cursor is near the edge of the surrounding scrollable pane.
  - In particular, test with three-fingers scroll in macOS.
- Test on Windows the styling of scrollbars. (Remember that autosizing the textarea in the content editor creates weird scrollbars, including a horizontal scrollbar because `autosize` is using `overflow: scroll;` instead of `overflow[-y]: auto;`, which may show up as a strip of white at the bottom on unstyled scrollbars.)
- `dateTimePicker`
  - Uses
    - Invitation `expiresAt`
    - Poll `closesAt`
  - Internal `dateTimePicker` state may be different from input, because, for example, you’re navigating between months/years to pick a day.
    - Year
    - Month
    - Selected day
    - Today
    - Hours
    - Minutes

## Pagination

- `TODO`
- Pagination of non-chat conversations should behave like GitHub Issues: Show the first couple messages, and the last couple messages, and have a gap in the middle that you can click to load.
- Smarter default page for when the page isn’t specified explicitly:
  - Messages
    - Deep links should go to the page containing the referred message
    - If there is no deep link but there are unread messages, go to page containing the first unread message
  - Conversations
    - Page containing the currently open conversation
- Load pages on scroll instead of button
- Deal with delete messages/conversations at the edges (before and after)
  - `CAST("reference" AS INTEGER) >= CAST(${request.query.beforeMessageReference} AS INTEGER)`
    - Create indices for `CAST("reference" AS INTEGER)` or convert `"reference"` into number (and then create an index for that!).
- On sending message on non-chat, it’s scrolling back to the first page.
- The “mark as read” (not “mark **all** as read”) button doesn’t work because it doesn’t visit all pages.
- Edge case: Show next/previous page on “no more messages”.
  - This is an edge case because people should only be able to get there when they manipulate the URL (or because they’re loading the next page right when an item has been deleted)
  - Difficult because we don’t have a “before” or “after” message to anchor to.
- Paginate other things, for example, Course Settings · Course Participants, and invitations.
- Things like clearing search and filters may affect query parameters.
- Rendering the sidebar is about 10% of the response time. When paginating, don’t include the sidebar.

## File Management

- Have a way to delete files.
- Access control around attachments:
  - Possibilities:
    1. Anyone with a link may see the attachment.
    2. Only people who are logged in may see the attachment.
    3. Only people in the same course may see the attachment.
    4. Only people with access to the particular conversation may see the attachment.
  - Right now we’re implementing 1, but we may want to go more strict if FERPA requires it or if someone asks for it.
  - The advantage of 1 is that at some point we may want to link directly to something like S3, so we don’t have to proxy the file ourselves.
  - The disadvantage of something like 3 or 4 is that a person can’t copy and paste messages across courses (think of a PDF with course rules being sent at the beginning of a semester).
- Let people configure other storage engines (for example, S3).
- Create a garbage collection routine for attachments.
- Clean geolocation & other metadata from images.

## Statistics

- How many questions & how fast they were answered.
- Number of people who are online.
- More statics from Piazza.
- Course staff members that should be on call answering questions, but aren’t.
- A way to grade interactions on conversations, for example, for when the homework is to discuss a certain topic. (It seems that Canvas has this feature.)
- Gamification
  - Badges (for example, first to answer a question)
  - Karma points for whole class and unlock achievements for everyone
- https://courselore.org/courses/8537410611/conversations/62

## Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

## Native Mobile & Desktop Applications

- Reference: https://github.com/moodlehq/moodleapp
- `NODE_EXTRA_CA_CERTS=".../Application Support/Caddy/pki/authorities/local/root.crt"`
- PWA: https://checkvist.com/auth/mobile
- Consider https://tauri.app
- Desktop: Electron.

```javascript
{
  "scripts": {
    "start": "electron ./index.js"
  },
  "devDependencies": {
    "electron": "^18.1.0"
  }
}

const { app, BrowserWindow } = require("electron");

(async () => {
  await app.whenReady();

  let browserWindow;
  const createBrowserWindow = () => {
    browserWindow = new BrowserWindow({
      width: 800,
      height: 600,
    });
    browserWindow.loadURL("https://leafac.local");
  };
  createBrowserWindow();

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createBrowserWindow();
  });

  app.setBadgeCount(3);
})();
```

- There’s also https://github.com/nativefier/nativefier, but it’s “minimally maintained,” and it may not have the features necessary to do things like badges.

- Mobile:
  - PWA
    - PWABuilder
    - Manifest
    - Service worker (Cache API)
    - Install to home screen
    - Push API & Notifications API
  - https://capacitorjs.com/
    - Agnostic to front-end framework.
    - Excellent onboarding experience.
    - Isn’t super popular, but the smaller community is enthusiastic.
    - It’s mostly for delivering a pre-bundled static website, but we want to use server-rendered HTML, and we want to connect to multiple servers.
  - https://reactnative.dev/
    - https://expo.dev/
    - Ties you to React.
    - Much more popular than anything else.
  - https://cordova.apache.org/
    - The spiritual predecessor of Capacitor.
    - Still more popular, but dreaded.
  - Warn users about untrusted content
  - Before redirecting the user, let the server verify that the instance does seem like a Courselore installation
  - Have a way to preview static part of the mobile application in the browser (without having to go though mobile simulators or actual devices)
  - Review the treatment of notches
    - Safe area padding
    - Progress bar should be in safe area
    - When the onscreen keyboard shows up, the bottom safe area gets large and the whole page shifts up
  - Treat the case in which you’re offline
  - Introduce a way for the web application to detect that we’re in the context of the mobile application.
    - Use a cookie? That’s what PWABuilder does.
    - Use preload scripts (but then how does that information carry across to the context of HTML loaded from the server?)
  - Close and reopen the application should take you to where you were before
  - Icon
    - Iconset creator
  - Certificate/signing/notarization
  - Apple may reject our application based on clause 4.2, but what about Mattermost, Discourse, Discord, and so forth?
    - They would probably have approved without questions if we had hidden our website from the internet 😛
    - Rendering HTML from relatively untrusted sources doesn’t help our case 🤷
  - Have a way to sign out
  - Have a way to sign in to multiple Courselore instances
- Have registry of Courselore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)
  - Perhaps this would be paid, to support our work of verifying the validity of the instance
  - That’s what Moodle does: https://moodle.com/solutions/moodle-app/

## Administrative Interface

- Users
  - See what courses people are on
- Courses
  - Access the course
    - Have a quick link to the list of course participants
  - Have a quick way to archive a course directly from this list
- Bulk actions on users & courses?
- When an administrator is creating a course, ask them if they want to be course staff, because perhaps they’re creating a course for someone else.
- Deal with the case in which you’re the administrator and also the course staff/student on a course.
  - Switch in out of administrator role and see the course differently.
- Extract a partial for user in list of users (to be used in `/courses/___/settings/course-participants` & administrative interface list of users).
- Administrators can have further control over user accounts:
  - Create a password reset link (for people who forgot their password and can’t receive email with the registered address)
  - Add people as participants in courses
  - Impersonate users & see the system just like the user sees it.
  - Remove a person from the system entirely
  - Manage sessions, for example, force a sign-out if it’s believed that an account is compromised
  - Perhaps even some more personal settings, for example, preferences related to email notifications
- Other ways to get administrators into the system:
  - Invitations for installation-wide roles
    - These would be similar to the invitations for a course. But email only, no invitation link.
  - Administrators may create users.
- Have some sort of visual indication of your own role in the system.
- Introduce the notion of “institution”
  - An institution may be a department, an university, and so forth.
  - For simplicity, institution can be the only layer of abstraction, let’s not model the relationship between departments, schools, universities, and so forth.
- Graph of use over time:
  - Number of users
  - Number of **active** courses (where an **active** course is a course that has seen recent activity, for example, a new conversation).
  - Activity on conversations
    - It’d be nice for the course course staff to also have access to that
- Low-level information:
  - Machine statistics, for example, disk space
  - Notifications: Disk running out of space, load average above normal, and so forth
  - Run an update
  - Run a backup
  - Have a wizard to set things up the first time: It’d have to be something like a command-line application, because without the basic information the server can’t even start.
  - Have a way to change configuration moving forward, by changing the configuration file and restarting the server (perhaps ask for confirmation and revert if necessary, similar to when you change the resolution of a display)
- Take a look at other nice features from Discourse’s administrative interface

## API

- Enable us to connect with other applications, for example, assignment management, and course material.
  - Though we won’t necessarily be going to those areas right away.
  - Integration is part of our short-term strategy.
- To build extensions, for example, ask a question from within the text editor.
- LTI
  - Submitting grades (for example, if discussing a topic in Courselore is part of an assignment, add that grade to the gradebook in Blackboard).

## Export

- More data, for example, likes, endorsements, polls, and so forth
- Export as SQLite (`response.contentType("application/vnd.sqlite3").send(database.serialize());`)
- Filters: Conversation types and so forth
- Don’t anonymize
- Include attachments
- Now we’re prioritizing the use case of exporting for research. In the future consider the use case of exporting for archiving your data.
- References
  - https://community.canvaslms.com/t5/Canvas-Ideas/Discussions-Export-Discussions/idi-p/360258
  - https://community.canvaslms.com/t5/Canvas-Ideas/Discussions-Download-discussion-board-posts/idi-p/377692

## AI

- Help course staff write answers
- Find similar questions (this semester, previous semesters)
- Sentiment analysis to avoid marking question as unresolved when student just said “thank you”
- Talk about this on home page.

## User Interface

- Allow for forcing light or dark mode: https://courselore.org/courses/8537410611/conversations/74
- Forms:
  - Use `maxlength`.
  - Keep the buttons disabled while the form isn’t in a valid state.
- Prevent the flash of unformatted datetime on fields using `validateLocalizedDateTime()`.
  - I tried to just reset all elements to the `valueInputByUser` at the end (which, incidentally, requires `window.setTimeout()` to not reset the value before the form data is actually sent to the server), but it doesn’t work. It seems like the only solution is to use an auxiliary `<input type="hidden">` that’s actually sent and an `<input type="text">` that drives it to show to the user.
- Have some kind of in-app guide for the first time you enter the system, or the first time you create a course, and that sort of thing. This should complement the video tutorials that we also want to make.
- Checkboxes that don’t have a visual indication may be confusing.
- Right click menus on stuff?
  - For example, something like the “Actions” menu under the ellipses on messages.
  - But they can frustrate people who just want to interact with the browser right-click context menu.
- Places where we show `administratorEmail` to report bugs could be forms instead.
- In Safari iOS, the address bar never collapses because of the way we’re doing panes.
- Add `-fill` to journal icons: https://github.com/twbs/icons/issues/1322

## Design & Accessibility

- Translate to other languages: 30 languages.
- Test screen readers.
  - https://piazza.com/product/accessibility
- Test contrast.
- FERPA
  - https://piazza.com/legal/ferpa

## Live-Navigation

- Client-side cache?
  - Advantages:
    - It’ll potentially be a bit faster.
  - Disadvantages:
    - It complicates the implementation.
    - It uses more memory on the client side.
  - Make sure to clear cache on sign-out or the back button will reveal private information.
- The submission of a form resets the state of the rest of the page.
  - For example, start editing the title of a conversation, then click on “Pin”. The editing form will go away.
    - Another example: When performing any simple form submission, for example, “Like”, the “NEW” message separator goes away. But maybe that’s a good thing: Once you interacted with the page, you probably already read the new messages, so it maybe it’s better for that separator to go away.
  - Even worse: When there are multiple forms on the page, and you partially fill both of them, submitting one will lose inputs on the other.
    - For example, when you’re filling in the “Start a New Conversation” form, and you do a search on the sidebar.
  - The first step would be keep the `hidden` state on form submission, but then other things break, for example, if you’re actually submitting a conversation title update, then the form should be hidden. As far as I can tell, there’s no way to detect what should be hidden and what should be shown automatically: We’d have to write special cases. For example, on the `onsubmit` of the conversation title update, we could add actions to reset the hidden state of the involved components.
  - Then, on `morph()`, we must look at the `originalEvent` and avoid updating form fields that aren’t the submitted form. This part is actually relatively straightforward: `detail.originalEvent instanceof SubmitEvent && detail.originalEvent.target.contains(from)`
- In response to a `POST`, don’t redirect, but render the page right away, saving one round trip. This is similar to the Turbo Streams approach, in which a stream is sent as a response to the `POST`.
- More sophisticated latency compensation:
  - Only for critical flows, for example, sending a message or liking.
  - Right now we’re doing a placeholder.
  - Approaches:
    - Pre-render on the client.
      - That’s what Discord appears to do.
      - But it’s limited because we don’t have enough information to do a full rendering, for example, resolving `@mention`s and `#reference`s. Those cases can be relatively rare, but still…
    - Use the `/preview` route?
      - This doesn’t seem like a good approach. On the one hand, it’d render the message more accurately. But it would incur a roundtrip to the server, so might as well do the action in the first place.
      - But we could pre-fetch…
- Preserve more client-side state, for example:
  - On the list of course participants (or list of users in administrative panel while it’s still naively implemented as a filter on the client side) the filter resets on form submission (for example, changing a person’s role).
  - In chats, submitting a form collapses the `conversation--header--full`.
- Scroll to URL `#hashes`, which may occur in the middle of a message.
- Prevent event attempting a Live-Navigation if the Live-Connection determines that you’re offline.

## Live-Connection

- Maybe don’t disconnect/reconnect the Live-Connection when a Live-Navigation will just return you to the same page?
  - It only saves the creation of connection metadata on the database on the server and the cost of establishing the connection.
  - A `POST` will already cause an update to the information on the page.
  - The implementation gets a bit awkward. The trick is to introduce the URL to the identity of the connection on top of the token which already identifies it. The token becomes the identity of the browser tab, and the URL becomes its state. If you put the two together, you can disconnect/reconnect only when necessary. But there are plenty of edge cases to deal with, for example, a Live-Update coming in right in the middle of a `POST` Live-Navigation.

**Live-Updates**

- Live-Updates can freeze the user interface for a split second, as the morphing is happening.
  - Examples of issues:
    - Typing on an inbox lags.
  - Potential solutions:
    - Break the work up by introducing some `await`s, which hopefully would give the event loop an opportunity to process user interactions.
    - Minimize the work on the client-side by making the pages small, so there’s less to diff.
    - Minimize the work on the client-side by sending only the diffs.
- Be more selective about who receives a Live-Update:
  - When we have pagination, take it a step further and only Live-Update tabs with the affected message open.
- Do something special on Live-Updates that result in 404.
  - Right now we just show the 404 to the person, without much context, which can be confusing.
  - For example, when we have a tab open with a conversation and someone else deletes it.
- Morphing on the server: Don’t send the whole page, only a diff to be applied on the client
- Partials
  - Relatively straightforward: Re-fetch partials in the background after a Live-Update? They may have gotten stale, for example, the “Views” component, if it’s open right as a Live-Update is happening.
  - More principled: Partials remember their URLs and keep their own Live-Updates lifecycle.
- Currently, if a connection comes in with a token we don’t identify, we treat that as a browser tab that was offline for a while and just reconnected, which means it receives a Live-Update right away. This can be superfluous if no change actually took place. This may be a minor issue—or not an issue at all. And addressing it probably complicates the Live-Updates mechanisms quite a bit. But, in any case, one potential solution is, instead of keeping tokens on the server and scheduling events to them, keep a notion of when things were updated, this way upon reconnection the client can say when it was the last time it got a Live-Update, and the server can know if another Live-Update is necessary. But the notion of tracking which parts of which pages require which data sounds error-prone.
- Authentication:
  - When the user signs out, send a Live-Update to all other browser tabs.
    - Store session in Live-Updates metadata database table.
  - When the user `Session.closeAllAndReopen()` (for example, when resetting the password), also send Live-Update, which will have the effect of signing you out to prevent personal information from being exposed.
- Pause after some period of inactivity?

## Performance

- Lazy loading & DRYing to reduce HTML payload
  - `userPartial` tooltip
  - `conversationPartial` tooltip on decorated content
  - Selected participants widget
    - New conversation
    - Conversations page (edit participants)
- View caching on the server.
  - https://guides.rubyonrails.org/caching_with_rails.html
  - This would interact in some way with server-side diffing on Live-Updates
  - Elm seems to do something similar
- Pre-fetching
  - There are some links that have side-effects
    - Marking messages as read.
    - Maintain navigation state:
      - `"users"."mostRecentlyVisitedCourseParticipant"`
      - `"courseParticipants"."mostRecentlyVisitedConversation"`
  - Potential workaround: Have some flag that the request is a pre-fetching (say, an HTTP header) and don’t perform these side-effects
  - All links in viewport
    - https://getquick.link/
  - Link under cursor
    - https://www.peterbe.com/plog/aggressively-prefetching-everything-you-might-click
    - https://www.mskog.com/posts/instant-page-loads-with-turbolinks-and-prefetch
    - http://instantclick.io
  - References:
    - https://web.dev/speculative-prerendering/
- Write a function to determine if processing content is even necessary. Most content doesn’t use extra features and could skip JSDOM entirely.
- Investigate other potential bottlenecks:
  - Synchronous stuff that could be async.
- Divide the page into frames that are lazy loaded independently, for example, the sidebar vs the main conversation pane?
  - Disadvantage: One more roundtrip to the server to complete the page.
  - Sidebar vs main content
    - On mobile may not need to load the sidebar at all
  - Pagination links.
    - Conversations in sidebar.
    - Messages in conversation.
  - Filters.
- Database:
  - Look for more database indices that may be necessary.
  - n+1 queries:
    - Cases:
      - `getConversation()`.
      - `getMessage()`.
      - Treatment of `@mentions` in Content Processor.
      - Finding which course participants to notify (not exactly an n+1, but we’re filtering in JavaScript what could maybe filtered in SQL (if we’re willing to use the `IN` operator)).
    - Potential solutions:
      - Single follow-up query with `IN` operator (but then you end up with a bunch of prepared statements in the cache).
      - Use a temporary table instead of `IN`.
      - Nest first query as a subquery and bundle all the information together, then deduplicate the 1–N relationships in the code.
  - We’re doing pagination of conversations in sidebar using `OFFSET`, because the order and presence of conversations changes, so we can’t anchor a `WHERE` clause on the first/last conversation shown. Try and find a better approach. Maybe use window functions anchored on the `row_number`.
- `slugify` is expensive, and it may be cacheable.
- Process content (which is CPU intensive) in worker thread (asynchronously)?
- We’re hitting the disk a lot, perhaps too much. More than Kill the Newsletter!
- Probably bad idea for reducing HTML size and improving performance: Have some “templates” as JavaScript strings at the global level that we reuse, for things like spinners. (Spooky action at a distance.)

## Infrastructure

- Have a way for people to enable/disable advanced features, for example whispers, similar to Amazing Marvin.
- Switch from `got` to `fetch`?
  - Streaming on image/video proxy
- Add support for source maps in production
  - The difficulty is that we have subprocesses, so we can’t simply pass `--enable-source-maps` as an argument to invoking the application through caxa. Instead, we must set the `NODE_OPTIONS=--enable-source-maps` environment variable as we do in development.
    - Maybe just set this environment variable when calling the subprocesses (and let the main process not use source maps—but it isn’t supposed to crash anyway…)?
- When extracting inline CSS/JavaScript with the Babel plugin normalize the snippets
  - It leads to a 10% improvement in CSS and a small improvement in JavaScript
  - Prettier: Starting with Prettier 3.0 `prettier.format()` is asynchronous, but Babel visitors have to be synchronous
    - https://github.com/prettier/prettier-synchronized : It’s under the Prettier organization, so there’s a chance that it’ll actually stick around, but it relies on running subprocesses, which seems hackish and potentially slow
    - https://www.npmjs.com/package/synckit : Again, running subprocesses
    - Some hack to let a Babel visitor run async code: There’s another library in the Babel ecosystem that implements the above hack with subprocesses
    - Rework the code to do a traversal only collecting the code, and a separate pass computing the canonical versions and so forth
    - Old version of Prettier: This is **very bad**
  - esbuild
    - Doesn’t recognize nested CSS syntax like we use it (it recognizes the new web standard, which arguably we should convert into, but in really the standard is still changing as of August 2023—they’re relaxing the requirement of the `&`)
  - Babel / PostCSS
    - PostCSS’s synchronous API is meant only for debugging/testing
    - https://www.npmjs.com/package/postcss-normalize-whitespace is necessary, otherwise PostCSS preserves whitespace
- If you created a course using Demonstration Data, perhaps sometimes inject new messages/conversations/likes, and so forth, to pretend that there are other people using the course. The demonstration in Moodle does something like that.
- A tab left open in Firefox for a long time seems to slow down the computer
  - https://courselore.org/courses/8537410611/conversations/75
- `partialParentElement` → `this.onbeforemorph = (event) => !event?.detail?.liveUpdate;`?
- Should `morph()` call `execute()`?
  - Improve `execute()`’s default `elements` to take `event` Live-Updates in account
    - Look at `DOMContentLoaded`
    - Double-check every use of `execute()`
- Use client-side templating (`` html\`\` ``)?
  - “Add Tag”
  - “Add Option” in polls
  - Latency compensation when sending message
- Try TypeScript on client-side JavaScript
  - `leafac--javascript.mjs`
  - `javascript=" ... "`
- Use `node --test` in other projects: look for uses of the `TEST` environment variable
- Use `fetch` instead of `got`?
- Sign out is slow because of `Clear-Site-Data` header (https://bugs.chromium.org/p/chromium/issues/detail?id=762417) (Apparently only an issue in Google Chrome)
- Extract component that does reordering (tags, poll options, and so forth).
- Test process manager on Windows
  - In development, `Ctrl+C`.
  - Kill process
    - Ways to kill
      - Preventable (`SIGTERM`)
      - Not preventable (`SIGKILL`)
    - Processes to kill
      - Main
      - Web
      - Worker
      - Caddy
  - Crash the server process
- Email system administrator in case of a crash.
- Remove checks for redundancy of boolean actions.
  - Examples:
    - Liking a message you already liked.
    - Endorsing a message you already endorsed.
    - Adding a tag that already exists.
    - Pinning a conversation that’s already pinned.
    - Setting as announcement a conversation that’s already an announcement.
  - Search for:
    - `== null`
    - `"true"`
    - `"false"`
    - `"on"`
    - `.patch`
- Convert from negative checks into positive checks: `== null`/`== undefined` → `typeof ___ === "string"`
- @types/nodemailer should export things like `SentMessageInfo`, because `.sendMail()` is overloaded, so you can’t use `ReturnType<___>`
- Children processes could tell main process that they’re ready, this way we could do things like, for example, only start Caddy when the `web` processes are ready to receive requests. If we do that, then we can enable Caddy’s active health checks.
- In the authentication workflow, there’s a query parameter called `invitation`, but it isn’t used only for invitations, so rename it to something like `user`.
- If a child process crashes too many times in a short period, then crash the main process.
- Extract libraries:
  - @leafac/javascript
  - @leafac/express
  - @radically-straightforward
  - Move some of the non-application-specific server-side code into a library (for example, cookie settings, server-sent events, logging, and that sort of thing).
    - Maybe move @leafac/express-async-handler into that library as well.
- Make top-level `await` available for `` javascript`...` ``.
  - Complication: many things, like `setTippy()` would become `async` as well.
  - Convert infinite loops with `update()` and `setTimeout()` into `while (true)` (search for `update(`).
  - No other existing `` javascript`...` `` needs this right now.
- Extract the logic to use SQLite as a job queue.
- In development, have a way to force jobs to run.
- Edge case in which Tippy must be removed from element:
  1. Change an invitation from expired to not expired.
  2. Change the invitation role. The error tooltip about not being able to change the role of an expired invitation will show up for a split second.
  - Probably there are other cases like this.
- DRY debounce that uses `isUpdating`
- DRY lazy loading of tooltip
- `key="...--<SOME-KIND-OF-REFERENCE>"` → `key=".../<SOME-KIND-OF-REFERENCE>"`
- Inconsistency: In the `liveConnectionsMetadata` (and possibly others) we store `expiredAt`, but in `session` (and possible others) we store `createdAt` and let the notion of expiration be represented in the code.
- autocannon: produce graphs (HDRHistogram)
- There’s a small chance (once every tens of thousands of requests) that you’ll get an “SQLite busy” error. I observed it when creating `liveConnectionsMetadata`, which is the only write in a hot path of the application. Treat that case gracefully.
- There’s an issue when running for the first time: Caddy may ask for your password, but you may not see it.
  - It still works if you see it and type in the password, even as other stuff has scrolled by.
  - Potential solutions:
    - Run Caddy before spawning other children processes (but how do you know that Caddy is done?)
    - Document this quirk.
- Investigate browser crashes on Android Chrome
- Add synchronizer token as added security against CSRF.
  - Currently we’re defending from CSRF with a [custom header](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers). This is the simplest viable protection, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, an old version of Flash).
  - [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
    - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
    - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
    - Couple the synchronizer token to the user session.
    - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
  - In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie).
    - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.
- `filenamify` may generate long names in pathological cases in which the extension is long.
- Things like `text--sky` and `mortarboard` are repeated throughout the application. DRY these up.
- When we start receiving code contributions, we might want to ask for people to sign a contributor’s agreement, because otherwise we’re locking ourselves out of the possibility of dual-licensing & perhaps selling closed-source extensions.
- Do things break if you’re trying to run Courselore from a directory that includes spaces & weird characters?
  - Note Caddy’s configuration and the serving of static files.
  - Test development.
  - Test binary.
  - Test on Windows.
- Review all uses of `fetch()`:
  - Treat the error cases
  - Have timeouts, because there may be no feedback if the internet goes down in the middle of an operation, and the connection may be left hanging, and we’ll be `await`ing forever.
    - But maybe this only applies to event-stream type of requests, and we have them covered already. Maybe for regular kinds of requests this would be overkill…
- Add missing `key`s:
  - `class=`
  - `querySelector`
  - `map(`
- “Mark all conversations as read” may be slow because it does a bunch of in `INSERT`s.
- Make Demonstration Data load faster by having a cache of pre-built data.
- Using `getConversation()` to enforce permissions may not be a great idea. It limits the number of search results in a weird way, that even leaks a bit of data. Also, it isn’t the most performant thing, probably (see point about n+1 queries). Maybe a better idea would be to `WHERE` the permissions everywhere, or use a database view.
- Rate limiting.
  - Caddy extensions are a possibility, but not a very good one, first because they don’t seem to be any good, and second because Caddy doesn’t know, for example, whether the user is signed in.
  - Check
    - Signed out → IP
    - Signed in → user identifier
  - Response: either a special HTTP status that means “rate limited,” or just delay the response.
- Find more places where we should be using database transactions.
- Automate:
  - Updates.
  - Backups.
    - SQLite
      - `VACUUM INTO`
      - better-sqlite3’s `.backup()` method.
- Have a way for self-hosters to migrate domains.
  - Rewrite avatars.
  - Rewrite URLs in messages.
  - Alternative: Don’t hard-code `hostname` into avatars & attachments, use `/absolute-paths` instead. (We can do that because Courselore doesn’t work from within a `/subpath` anyway, for cookie reasons.)
- In some situations, we’re unnecessarily updating the boolean fields in the database that are represented as dates. For example, `"tags"."staffOnlyAt"` on `PUT /courses/:courseReference/settings/tags`.
- Right now we’re allowing any other website to embed images. If we detect abuse, add an allowlist.
- Caddy could silence logs **after** a successful startup.
- Image proxy
  - Max size 5242880
  - Max number of redirects 4
  - Timeout 10s
  - Resizing?
  - Caching? Not only for performance, but also because third-party images may go away
  - Include HMAC
    - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.
  - Allow hotlinking from our proxy? This has implications on the decision to not use HMAC on the proxy, and also has implications on rendering hotlinked images on third-party websites, for example, the Outlook email client, as soon as we start sending email notifications with fully processed content (right now we send the pre-processed content, but we want to change that so that things like `@mentions` show up more properly.)
    - This is necessary to 100% guarantee that people will be able to see images on Outlook
- Automated tests.

## Documentation

- Videos
  - Educators:
    - Short “sales pitch”
    - Tutorial
  - Students:
    - Tutorial
  - Lower priority: We’ll do this in the future and rely solely on the text-based instructions for now:
    - System administrators:
      - How to deploy, backup, and update
    - Developers:
      - How to setup for development.
- “One-click deployment”
  - DigitalOcean.
  - Linode.
  - Amazon.
  - Google Cloud.
  - Microsoft Azure.
  - https://sandstorm.io.
- Developer documentation: Project architecture and other things that new developers need to know.

## Marketing

- Communicate that we’re in a free hosting period **for now**.
- Invest more in marketing on spring.
  - Buy keywords on Google.
- Goal: Double usage every semester for the first couple semesters.
- Start charging by 2024, start turning a profit by 2026.
  - But only start charging when we have a thousand users.
- Homepage:
  - Remove more generic stuff like dark mode
  - Add new features:
    - Polls
    - Whispers
    - SAML
    - LTI
  - Better printscreens without `lorem ipsum`.
  - Example of designs that we like:
    - https://capacitorjs.com
    - https://circle.so
    - https://www.docker.com
  - At some point hire a designer to make it shinier
  - Comparison chart: Courselore, Piazza, Campuswire, edstem, and so forth.
    - Make sure to mention that we’re open-source.
    - Piazza has LTI support (for identity only?).
  - Business model
    - Open-source, so free forever.
    - Hosting at <courselore.org> is free for a couple years.
- User groups.
- Newsletter.
  - For system administrators, including updates & so forth.
  - For educators, including news & so forth.
  - For students?
- Create Courselore Gravatar.
  - Use in npm.
- Create accounts on:
  - Facebook.
  - Instagram.
  - Reddit.
- Make a public page listing known issues.
- Add a call-to-action on the bottom navigation bar that isn’t just about reporting bugs, but about providing feedback and joining the Courselore community.
- Google
  - https://www.partneradvantage.goog/
  - https://cloud.google.com/partners/become-a-partner/
  - Independent Software Vendor (ISV)
  - $3000–$6000/year
- Look at other system to find features that people will ask for.

## References

- Main
  - <https://moodle.org>
    - https://github.com/moodlehq/moodle-docker/
      - `export MOODLE_DOCKER_WWWROOT=/Users/leafac/Code/courselore/REFERENCES/moodle && export MOODLE_DOCKER_DB=pgsql && bin/moodle-docker-compose up -d && open http://localhost:8000/ && http://localhost:8000/_/mail/`
      - Site administration > General > Security > HTTP Security: cURL blocked hosts list & cURL allowed ports list
      - In **Site administration**, add users.
      - Site Administration > Users > Assign system roles, and assign teacher the **Course creator** role.
      - Add course from teacher’s perspective
      - `admin / administrator@courselore.org / 1234567890`
      - `teacher / teacher@courselore.org / 1234567890`
      - `student / student@courselore.org / 1234567890`
    - https://hub.docker.com/r/bitnami/moodle
    - https://download.moodle.org/releases/latest/
  - <https://canvaslms.com>
    - https://github.com/instructure/canvas-lms/blob/master/doc/docker/developing_with_docker.md
      - Install Dory
      - Enable MailCatcher
    - `dory up && docker-compose up -d && open http://canvas.docker/ && open http://mail.canvas.docker/`
    - `administrator@courselore.org / 1234567890`
    - `teacher@courselore.org / 1234567890`
    - `student@courselore.org / 1234567890`
  - <https://discourse.org>
    - https://meta.discourse.org/t/install-discourse-for-development-using-docker/102009
    - `d/rails s`
    - `d/ember-cli`
    - `open http://localhost:4200`
- Communication platforms for education
  - <https://piazza.com>
  - <https://campuswire.com>
    - <https://campus.org>
  - <https://edstem.org>
  - <https://aula.education>
  - <https://yellowdig.com>
    - Point-based system; gamification.
  - <https://github.com/sakaiproject/sakai>
  - <https://www.acadly.com/>
  - <https://www.d2l.com/products/>
  - <https://www.nectir.io>
- General-purpose communication platforms
  - <https://github.com>
  - <https://reddit.com>
  - <https://basecamp.com>
  - <https://slack.com>
- Open-source communication platforms
  - <https://github.com/zulip/zulip>
  - <https://github.com/RocketChat/Rocket.Chat>
  - <https://github.com/mattermost/mattermost-server>
- Graders
  - <https://www.codegrade.com/>
    - <https://app.codegra.de/login>
    - <https://github.com/CodeGra-de>
    - <https://github.com/CodeGrade/bottlenose>
- Self-hosting
  - <https://www.reddit.com/r/selfhosted/>
  - <https://selfhosted.show>
  - <https://github.com/awesome-selfhosted/awesome-selfhosted>
  - <https://gitlab.com>
  - <https://wordpress.org>
  - <https://gitea.io/>
  - <https://gogs.io/>
- Content editors
  - <https://typora.io>
  - <https://www.notion.so>
  - <https://marktext.app>
- Conferences
  - <https://events.educause.edu/annual-conference>
  - <https://openeducationconference.org>
  - <https://www.digitallyengagedlearning.net>
