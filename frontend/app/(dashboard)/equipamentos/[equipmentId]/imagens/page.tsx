import { EquipmentThermographicHistoryPage } from "@/components/dashboard/thermography/equipment-thermographic-history-page";

export default async function EquipmentImagesRoute({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;
  return <EquipmentThermographicHistoryPage equipmentId={Number(equipmentId)} />;
}
