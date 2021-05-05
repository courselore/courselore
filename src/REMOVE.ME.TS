$${app.locals.partials.textProcessor(
  // prettier-ignore
  markdown`
# What Will CourseLore Be?

**A forum for educators & students.**

CourseLore will support Q&A, announcements, anonymous posting, [Markdown](https://commonmark.org) & [LaTeX](https://www.latex-project.org) rendering, and everything else you’ve come to expect from a modern web application.

# How Will CourseLore Be Different?

**[Open Source](https://github.com/courselore):** You may inspect the CourseLore’s code to guarantee that it meets your standards in terms of quality, privacy, and security. You may learn from the code base (we’re making it very beginner-friendly). You may contribute back to the project.

**Self-Hosted:** You’ll be able to run your own instance of CourseLore on your servers for maximum privacy. It’ll be easy!

**Respect for Privacy:** We’ll never share information about educators & students with third-parties.

**Modern Interface:** CourseLore will look familiar, because we’re basing it on our experience of what works and what doesn’t in other student forums. And it’s 2021, so CourseLore has to look welcoming and modern to educators & students.

**Programmable:** Advanced users will be able to use the CourseLore API to integrate CourseLore with other systems and write automation scripts. Also, you may mount CourseLore as part of a bigger application.

# Who’s behind CourseLore?

<div id="people">

<div>

[<img src="scott.png" alt="Dr. Scott Smith" width="200" />  
**Dr. Scott Smith**](https://www.cs.jhu.edu/~scott/)  
<small>
CEO  
<scott@courselore.org>
</small>

Scott is a full professor at the [Johns Hopkins University](https://www.jhu.edu). Over his almost thirty years of experience as an educator, Scott taught courses on the Principles of Programming Languages, Object-Oriented Software Engineering, Functional Programming, and so forth.

</div>

<div>

[<img src="ali.png" alt="Dr. Ali Madooei" width="200" />  
**Dr. Ali Madooei**](https://www.cs.jhu.edu/faculty/ali-madooei/)  
<small>
Consultant  
<ali@courselore.org>
</small>

Ali is a lecturer at the [Johns Hopkins University](https://www.jhu.edu). Ali has taught courses in several areas, from Introduction to Programming to Object-Oriented Software Engineering. Ali has classroom experience with many student forums and knows what it takes to make a great one.

</div>

<div>

[<img src="leandro.png" alt="Leandro Facchinetti" width="200" />  
**Leandro Facchinetti**](https://leafac.com)  
<small>
Developer & Designer  
<leandro@courselore.org>
</small>

Leandro was a PhD Candidate at the [Johns Hopkins University](https://www.jhu.edu), advised by Scott. He received the **Whiting School of Engineering’s Professor Joel Dean Excellence in Teaching Award** for five years of work as a teaching assistant, and taught a course on [Object-Oriented Software Engineering](https://oose-2019.leafac.com).

</div>

</div>

# I’m Interested! How Do I Participate?

**Try our [super-early development demos](${app.locals.settings.url}/authenticate)!**

**Educators & Students:** We want to hear [your feedback](mailto:feedback@courselore.com).

**Developers & Designers:** Contribute on [GitHub](https://github.com/courselore).
`
)}





input[type="radio"]:not(.undecorated) {
  border-radius: 50%;

  &:checked {
    background-image: url("data:image/svg+xml;base64,${Buffer.from(
      app.locals.icons["circle-fill"].replace(
        "currentColor",
        "white"
      )
    ).toString("base64")}");
    background-size: 6px 6px;
  }
}

input[type="checkbox"]:not(.undecorated) {
  border-radius: 3px;

  &:checked {
    background-image: url("data:image/svg+xml;base64,${Buffer.from(
      app.locals.icons["check"].replace("currentColor", "white")
    ).toString("base64")}");
  }
}

textarea:not(.undecorated) {
  min-height: 10rem;
  padding: 0.5rem 1rem;
  resize: vertical;
  white-space: pre-wrap;
}

select:not(.undecorated) {
  padding-right: 1.5rem;
  background: url("data:image/svg+xml;base64,${Buffer.from(
      app.locals.icons["caret-down-fill"]
    ).toString("base64")}")
    top 0.45rem right 0.3rem no-repeat;
  @media (prefers-color-scheme: dark) {
    background-image: url("data:image/svg+xml;base64,${Buffer.from(
      app.locals.icons["caret-down-fill"].replace(
        "currentColor",
        "#d4d4d4"
      )
    ).toString("base64")}");
  }
  background-size: 0.8em 0.8em;

  &:disabled {
    background-image: url("data:image/svg+xml;base64,${Buffer.from(
      app.locals.icons["caret-down-fill"].replace(
        "currentColor",
        "gray"
      )
    ).toString("base64")}");
    @media (prefers-color-scheme: dark) {
      background-image: url("data:image/svg+xml;base64,${Buffer.from(
        app.locals.icons["caret-down-fill"].replace(
          "currentColor",
          "whitesmoke"
        )
      ).toString("base64")}");
    }
  }
}













@at-root {
  body {
    font-size: 0.875rem;
    -webkit-text-size-adjust: 100%;
    line-height: 1.5;
    font-family: "IBM Plex Sans", sans-serif;
    margin: 0;
    overflow-wrap: break-word;

    @media (prefers-color-scheme: dark) {
      color: #d4d4d4;
      background-color: #1e1e1e;
    }
  }

  code {
    font-family: "IBM Plex Mono", monospace;
  }

  ::selection {
    color: white;
    background-color: #ff77a8;
  }

  :focus:focus {
    outline: none;
    box-shadow: 0 0 0 2px #ff77a8aa;
  }

  img,
  svg {
    max-width: 100%;
    height: auto;
  }

  img {
    border-radius: 10px;
    background-color: white;
  }

  .bi {
    width: 1em;
  }

  h1 {
    font-size: 1.3rem;
    line-height: 1.3;
    font-weight: bold;
  }

  pre,
  div.math-display {
    overflow: auto;
    overflow-wrap: normal;
  }

  pre {
    line-height: 1.3;
  }

  a {
    color: inherit;
    transition: color 0.2s;

    &:hover,
    &:focus {
      color: #ff77a8;
    }

    h1 &,
    nav & {
      text-decoration: none;
    }
  }

  input,
  textarea,
  select,
  button {
    all: unset;

    @supports (-webkit-touch-callout: none) {
      font-size: 16px;
    }

    &:not(.undecorated) {
      background-color: white;
      @media (prefers-color-scheme: dark) {
        background-color: #5a5a5a;
      }
      padding: 0.1rem 1rem;
      border: 1px solid gainsboro;
      border-radius: 5px;
      @media (prefers-color-scheme: dark) {
        border-color: dimgray;
      }
      box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;

      &:disabled {
        color: gray;
        @media (prefers-color-scheme: dark) {
          color: whitesmoke;
        }
        background-color: whitesmoke;
        @media (prefers-color-scheme: dark) {
          background-color: #333333;
        }
        cursor: not-allowed;
      }
    }
  }

  input[type="text"],
  input[type="email"],
  input[type="search"],
  textarea {
    cursor: text;
  }

  input[type="search"]::-webkit-search-decoration {
    -webkit-appearance: none;
  }

  input[type="radio"],
  input[type="checkbox"] {
    display: inline-block;

    &:not(.undecorated) {
      width: 12px;
      height: 12px;
      padding: 0;
      position: relative;
      top: 0.15em;

      &:checked {
        background: #ff77a8 center center no-repeat;
        border-color: #ff77a8;
      }
    }
  }

  button {
    text-align: center;
    cursor: default;

    &:not(.undecorated):active {
      color: white;
      background-color: #ff77a8;
    }
  }

  details.dropdown {
    &[open] > summary::before {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }

    & > summary + * {
      background-color: whitesmoke;
      @media (prefers-color-scheme: dark) {
        background-color: #464646;
      }
      max-width: 300px;
      padding: 0 1rem;
      border: 1px solid darkgray;
      border-radius: 10px;
      box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010,
        0 0 50px -20px black;
      position: absolute;
    }
  }

  summary {
    cursor: default;

    &:hover,
    details[open] > & {
      color: #ff77a8;
    }

    &.no-marker {
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  hr {
    border: none;
    border-top: 1px solid silver;
    @media (prefers-color-scheme: dark) {
      border-color: black;
    }
  }

  blockquote {
    color: gray;
    padding-left: 0.5rem;
    border-left: 3px solid gray;
    margin: 1rem 0;
  }

  [hidden] {
    display: none !important;
  }

  .full-width {
    box-sizing: border-box;
    width: 100%;
    display: block;
  }

  .secondary {
    font-size: 0.75rem;
    font-weight: normal;
    line-height: 1.3;
    color: gray;
    margin-top: -0.8rem;
  }

  .green {
    color: #008751;
    @media (prefers-color-scheme: dark) {
      color: #00e436;
    }
  }

  .red {
    color: #ff004d;
  }

  @media (prefers-color-scheme: light) {
    .dark {
      display: none;
    }
  }

  @media (prefers-color-scheme: dark) {
    .light {
      display: none;
    }
  }
}