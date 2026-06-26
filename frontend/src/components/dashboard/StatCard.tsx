import Card from "../ui/Card";

type Props = {
  title: React.ReactNode;
  value: string | number;
};

export default function StatCard({ title, value }: Props) {
  return (
    <Card>

      <p className="text-slate-400">
        {title}
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {value}
      </h2>

    </Card>
  );
}