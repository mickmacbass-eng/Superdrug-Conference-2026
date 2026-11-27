import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Poll } from '../data/conferenceData';

export const POLL_CHART_COLORS = [
  '#E5007D', // Superdrug Pink
  '#171717', // Obsidian Black
  '#64748B', // Cool Slate
  '#F472B6', // Soft Rose
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald
];

interface PollResultsPieChartProps {
  poll: Poll;
  revealedByModerator?: boolean;
}

interface ChartDatum {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  isUserChoice: boolean;
}

export const PollResultsPieChart: React.FC<PollResultsPieChartProps> = ({
  poll,
  revealedByModerator = false,
}) => {
  const totalVotes = poll.totalVotes || 0;

  const data: ChartDatum[] = poll.options.map((opt, idx) => ({
    id: opt.id,
    name: opt.text,
    value: opt.votes,
    percentage: totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0,
    color: POLL_CHART_COLORS[idx % POLL_CHART_COLORS.length],
    isUserChoice: poll.userVotedOptionId === opt.id,
  }));

  const nonZeroData = data.filter((item) => item.value > 0);

  return (
    <div className="pt-3 border-t border-neutral-100 space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-neutral-500">
          Visual Breakdown
        </span>
        <span className="text-neutral-500 font-medium">
          {revealedByModerator ? 'Revealed by Moderator' : 'Live Vote Share'}
        </span>
      </div>

      {totalVotes === 0 ? (
        <div className="py-5 px-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center text-xs text-neutral-500">
          Results are live — awaiting the first delegate vote.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Donut Pie Chart */}
          <div className="relative w-40 h-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nonZeroData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={70}
                  paddingAngle={nonZeroData.length > 1 ? 2 : 0}
                  cornerRadius={4}
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationDuration={450}
                >
                  {nonZeroData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown, _name: unknown, props: { payload?: ChartDatum }) => {
                    const votes = typeof value === 'number' ? value : Number(value) || 0;
                    const pct = props?.payload?.percentage ?? 0;
                    return [`${votes} ${votes === 1 ? 'vote' : 'votes'} (${pct}%)`, ''];
                  }}
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: '#ffffff',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                  }}
                  itemStyle={{ color: '#ffffff', fontWeight: 700, padding: 0 }}
                  labelStyle={{ color: '#d4d4d4', fontSize: '10px', marginBottom: '2px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Vote Counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-black font-mono tabular-nums leading-none">
                {totalVotes}
              </span>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">
                {totalVotes === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          </div>

          {/* Color-Keyed Legend */}
          <div className="flex-1 w-full space-y-2">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 text-xs leading-snug"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span
                    className={`truncate ${
                      item.isUserChoice ? 'font-bold text-black' : 'text-neutral-700'
                    }`}
                    title={item.name}
                  >
                    {item.name}
                    {item.isUserChoice ? ' (You)' : ''}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-black tabular-nums whitespace-nowrap shrink-0">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
