// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Sash } from "../src/components/Sash";
it("resizes by keyboard, clamps and resets", () => {
 const change=vi.fn();render(createElement(Sash,{label:"Locations",value:220,min:160,max:360,initial:220,onChange:change,onCollapse:()=>{}}));
 const sash=screen.getByRole("separator");fireEvent.keyDown(sash,{key:"ArrowRight",shiftKey:true});expect(change).toHaveBeenLastCalledWith(284);fireEvent.keyDown(sash,{key:"Home"});expect(change).toHaveBeenLastCalledWith(160);fireEvent.doubleClick(sash);expect(change).toHaveBeenLastCalledWith(220);
});
