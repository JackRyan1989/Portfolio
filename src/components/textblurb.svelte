<script>
  export let makeSmall;
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.gstatic.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<section class={makeSmall ? "fadeIn" : null}>
  {#if makeSmall}
    <article>
      <h2>Howdy!</h2>
      <br />
      <p>
        In February 2020, I graduated from the UPenn LPS Coding Bootcamp. Shortly
        thereafter I started my current job as a web developer at Drexel
        University, where I work as a front-end developer operating in
        Sitecore CMS. I'm passionate about quality and accessible design and
        code. I'm always very interested in learning new things, and in fact this
        portfolio is the first site I've made using <a
          href="https://svelte.dev"
          target="_blank">Svelte</a
        >! I'm also the proud father of one human being and two cats!
        <br />
        <br />
        This site serves as both a portfolio to demonstrate recent and
        past work and as a sandbox for me to play in. I've also included a little bit
        about my past life in cognitive-neuroscience research, because that was neat
        too.
      </p>
    </article>
  {/if}
</section>

<style>
  * {
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    vertical-align: baseline;
    background: transparent;
  }

  section {
    display: grid;
    padding: 0.25em 0.5em;
    font-family: Nunito, sans-serif;
    font-weight: 200;
    opacity: 0;
  }

  .fadeIn {
    opacity: 1;
    transition-property: opacity;
    transition-duration: 0.3s;
    transition-timing-function: cubic-bezier(0.97, -0.01, 0.93, 0.43);
    max-width: 80ch;
  }
</style>
