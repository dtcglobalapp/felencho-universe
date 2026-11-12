import { HologramEntity, type EntityProps } from "./HologramEntity";
export { LINA_PALETTE, BOB_PALETTE } from "./HologramEntity";
export function LinaEntity(props: EntityProps) { return <HologramEntity {...props} persona="lina" />; }
