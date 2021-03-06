import { render } from "@testing-library/svelte";
import "@testing-library/jest-dom/extend-expect";
import Textblurb from "../components/textblurb.svelte";

test("shows proper heading when makeSmall is true", () => {
  const { getByText } = render(Textblurb, {makeSmall: true});

  expect(getByText("Howdy!")).toBeInTheDocument();
});

test("does not render the any component when makeSmall is false", () => {
  const { queryByText } = render(Textblurb, {makeSmall: false});
  const howdy = queryByText("Howdy");
  expect(howdy).toBeNull();
});